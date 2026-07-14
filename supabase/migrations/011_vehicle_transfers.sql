-- CarLink Vehicle Transfers
-- Transfer ownership of vehicles between users with full audit trail

-- ===================== VEHICLES: Add transfer fields =====================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
  CHECK (status IN ('active', 'transferred', 'sold', 'archived'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transferred_to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS original_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_transferred_to ON vehicles(transferred_to_user_id);

-- ===================== VEHICLE TRANSFERS (Audit Trail) =====================
CREATE TABLE vehicle_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  transfer_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vehicle_transfers_vehicle ON vehicle_transfers(vehicle_id);
CREATE INDEX idx_vehicle_transfers_from_user ON vehicle_transfers(from_user_id);
CREATE INDEX idx_vehicle_transfers_to_user ON vehicle_transfers(to_user_id);
CREATE INDEX idx_vehicle_transfers_status ON vehicle_transfers(status);
CREATE INDEX idx_vehicle_transfers_expires ON vehicle_transfers(expires_at);

ALTER TABLE vehicle_transfers ENABLE ROW LEVEL SECURITY;

-- Users can read transfers they initiated or received
CREATE POLICY "Users can read own transfers"
  ON vehicle_transfers FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can create transfers for their vehicles
CREATE POLICY "Users can create transfers for own vehicles"
  ON vehicle_transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles 
      WHERE vehicles.id = vehicle_transfers.vehicle_id 
      AND vehicles.owner_id = auth.uid()
    )
  );

-- Users can update transfers they initiated (cancel)
CREATE POLICY "Users can cancel own pending transfers"
  ON vehicle_transfers FOR UPDATE
  USING (auth.uid() = from_user_id AND status = 'pending')
  WITH CHECK (auth.uid() = from_user_id AND status IN ('pending', 'cancelled'));

-- ===================== FUNCTION: Complete vehicle transfer =====================
CREATE OR REPLACE FUNCTION complete_vehicle_transfer(transfer_id UUID, new_owner_id UUID)
RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
  v_vehicle RECORD;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer FROM vehicle_transfers WHERE id = transfer_id;
  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF v_transfer.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer not pending';
  END IF;
  IF v_transfer.expires_at < now() THEN
    RAISE EXCEPTION 'Transfer expired';
  END IF;

  -- Get vehicle
  SELECT * INTO v_vehicle FROM vehicles WHERE id = v_transfer.vehicle_id;
  IF v_vehicle IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  -- Update transfer
  UPDATE vehicle_transfers SET
    status = 'completed',
    to_user_id = new_owner_id,
    completed_at = now()
  WHERE id = transfer_id;

  -- Update vehicle: transfer ownership, keep original owner for audit
  UPDATE vehicles SET
    owner_id = new_owner_id,
    original_owner_id = COALESCE(original_owner_id, v_vehicle.owner_id),
    status = 'transferred',
    transferred_at = now(),
    transferred_to_user_id = new_owner_id,
    sell_enabled = false,
    sell_price = '',
    sell_city = '',
    sell_zip = '',
    sell_phone = '',
    sell_description = ''
  WHERE id = v_transfer.vehicle_id;

  -- Transfer NFC tokens to new owner
  UPDATE nfc_tokens SET user_id = new_owner_id WHERE vehicle_id = v_transfer.vehicle_id;

  -- Revoke any active found requests for this vehicle
  UPDATE found_requests SET status = 'expired' 
  WHERE vehicle_id = v_transfer.vehicle_id AND status = 'pending';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== FUNCTION: Cancel vehicle transfer =====================
CREATE OR REPLACE FUNCTION cancel_vehicle_transfer(transfer_id UUID, canceller_id UUID, reason TEXT DEFAULT '')
RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  SELECT * INTO v_transfer FROM vehicle_transfers WHERE id = transfer_id;
  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF v_transfer.from_user_id != canceller_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_transfer.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer not pending';
  END IF;

  UPDATE vehicle_transfers SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = canceller_id,
    cancellation_reason = reason
  WHERE id = transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== TRIGGER: Auto-expire pending transfers =====================
CREATE OR REPLACE FUNCTION expire_pending_transfers()
RETURNS VOID AS $$
BEGIN
  UPDATE vehicle_transfers SET
    status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Can be run via pg_cron or scheduled job
-- SELECT cron.schedule('expire-transfers', '0 * * * *', 'SELECT expire_pending_transfers()');