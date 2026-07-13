-- Add WhatsApp fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT '';

-- Create found_requests table
CREATE TABLE IF NOT EXISTS found_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    finder_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
    nfc_token_id uuid REFERENCES nfc_tokens(id) ON DELETE SET NULL,
    message text DEFAULT '',
    contact_method text DEFAULT 'email',
    finder_email text DEFAULT '',
    finder_name text DEFAULT '',
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Index for fast owner lookups
CREATE INDEX IF NOT EXISTS idx_found_requests_owner ON found_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_found_requests_status ON found_requests(status);
