export interface Vehicle {
  id: string;
  owner_id: string;
  plate: string;
  city: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  color: string;
  image_url: string;
  nfc_active: boolean;
  sell_enabled: boolean;
  sell_price: string;
  sell_city: string;
  sell_zip: string;
  sell_phone: string;
  sell_description: string;
  vehicle_condition: string;
  wallet_bg_preset_id: string | null;
  wallet_bg_custom_url: string | null;
  wallet_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  workshop_id: string | null;
  service_type: string;
  description: string;
  mileage: number;
  date: string;
  workshop: string;
  cost: number;
  lubricant_brand: string;
  lubricant_type: string;
  next_service_mileage: number | null;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  vehicle_id: string;
  name: string;
  category: string;
  brand: string;
  part_number: string;
  status: string;
  mileage_installed: number | null;
  lifespan_mileage: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  vehicle_id: string;
  name: string;
  issued_by: string;
  issue_date: string | null;
  expiry_date: string | null;
  file_url: string;
  cost: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  vehicle_id: string;
  name: string;
  type: string;
  file_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentEnhanced extends Document {
  status: DocumentStatus;
  expires_at: string | null;
  doc_number: string;
}

export type DocumentStatus = 'vigente' | 'por_vencer' | 'vencido' | 'pendiente';

export interface GalleryImage {
  id: string;
  vehicle_id: string;
  image_url: string;
  caption: string;
  sort_order: number;
  created_at: string;
}

export interface Diagnostic {
  id: string;
  vehicle_id: string;
  alert_type: string;
  description: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  document_number: string | null;
  verification_status: VerificationStatus | null;
  verification_doc_url: string | null;
  verification_note: string | null;
  verified_at: string | null;
  whatsapp_enabled: boolean | null;
  whatsapp_number: string | null;
  subscription_status?: SubscriptionStatus | null;
  subscription_plan?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
}

export interface NfcToken {
  id: string;
  vehicle_id: string;
  token_prefix: string;
  label: string;
  is_active: boolean;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
}

export interface Workshop {
  id: string;
  owner_id: string;
  legal_id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  description: string;
  logo_url: string;
  is_verified: boolean;
  stamps_required: number;
  promotion_description: string;
  // Panel de negocio (migración de tallerpro/, ver docs/PLAN_MIGRACION_TALLERPRO.md)
  slogan: string;
  workshop_type: string;
  email: string;
  business_hours: string;
  specialties: string[];
  manager_name: string;
  manager_role: string;
  manager_avatar: string;
  tax_rate_percent: number;
  certification_code: string;
  social_instagram: string;
  social_facebook: string;
  social_website: string;
  social_whatsapp: string;
  rating: number;
  created_at: string;
}

/** Ficha pública del taller (GET /workshops/{code}) — Workshop + sub-recursos
 * ya resueltos por el backend en un solo response. */
export interface WorkshopPublic extends Workshop {
  mechanics: WorkshopMechanic[];
  service_items: WorkshopServiceItem[];
  reviews: WorkshopReview[];
}

export interface WorkshopMechanic {
  id: string;
  workshop_id: string;
  name: string;
  role: string;
  specialty: string;
  phone: string;
  active: boolean;
  avatar_url: string;
  created_at: string;
}

export interface WorkshopServiceItem {
  id: string;
  workshop_id: string;
  name: string;
  category: string;
  estimated_price: number;
  estimated_hours: number;
  description: string;
  created_at: string;
}

export interface WorkshopClient {
  id: string;
  workshop_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  document_id: string;
  created_at: string;
}

export interface WorkshopVehicle {
  id: string;
  workshop_id: string;
  client_id: string;
  linked_vehicle_id: string | null;
  license_plate: string;
  brand: string;
  model: string;
  year: number | null;
  vin: string;
  mileage: number;
  fuel_type: string;
  color: string;
  created_at: string;
}

export interface WorkOrderLaborItem {
  id: string;
  description: string;
  hours: number;
  rate_per_hour: number;
  total: number;
}

export interface WorkOrderPart {
  id: string;
  part_id: string | null;
  part_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  subtotal: number;
}

export interface WorkOrderPhotoEvidence {
  id: string;
  url: string;
  caption: string;
  category: string;
  uploaded_by: string;
  created_at: string;
}

export type WorkOrderStatus =
  | 'Pendiente'
  | 'En Proceso'
  | 'Diagnosticado'
  | 'Listo para Entrega'
  | 'Entregado'
  | 'Cancelado';

export interface WorkOrder {
  id: string;
  workshop_id: string;
  order_number: string;
  workshop_vehicle_id: string;
  client_id: string;
  mechanic_id: string | null;
  entry_date: string;
  estimated_completion_date: string | null;
  completed_date: string | null;
  status: WorkOrderStatus | string;
  symptoms: string;
  technical_notes: string;
  category: string;
  labor_total: number;
  parts_total: number;
  total_cost_price: number;
  total_amount: number;
  tax_amount: number;
  final_total: number;
  net_profit: number;
  is_paid: boolean;
  payment_method: string;
  created_at: string;
  labor_items: WorkOrderLaborItem[];
  parts_items: WorkOrderPart[];
  photo_evidences: WorkOrderPhotoEvidence[];
}

export interface WorkshopInventoryPart {
  id: string;
  workshop_id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  retail_price: number;
  location: string;
  compatible_models: string[];
  last_restock_date: string | null;
  created_at: string;
}

export type AppointmentStatus = 'Confirmada' | 'Pendiente' | 'Completada' | 'Cancelada';

export interface Appointment {
  id: string;
  workshop_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  vehicle_plate: string;
  vehicle_model: string;
  service_category: string;
  notes: string;
  appointment_date: string;
  time_slot: string;
  duration_minutes: number;
  status: AppointmentStatus | string;
  converted_to_work_order_id: string | null;
  created_at: string;
}

export type NotificationChannel = 'WhatsApp' | 'SMS' | 'Email';

export interface WorkshopNotification {
  id: string;
  workshop_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string;
  channel: NotificationChannel | string;
  notification_type: string;
  message: string;
  /** 'enviado' (email real) | 'simulado' (sin proveedor WhatsApp/SMS) | 'fallido' */
  status: string;
  vehicle_plate: string;
  work_order_id: string | null;
  sent_at: string;
}

export interface WorkshopDocument {
  id: string;
  workshop_id: string;
  doc_number: string;
  doc_type: string;
  issue_date: string;
  client_name: string;
  client_tax_id: string;
  recipient_role: string;
  vehicle_plate: string;
  vehicle_model: string;
  work_order_id: string | null;
  amount: number | null;
  mechanic_name: string;
  validity_months: number | null;
  details: string;
  issued_by: string;
  status: string;
  created_at: string;
}

export interface WorkshopReview {
  id: string;
  workshop_id: string;
  client_name: string;
  rating: number;
  review_date: string;
  comment: string;
  vehicle_model: string;
  is_verified_client: boolean;
  manager_response: string;
  created_at: string;
}

export interface WorkshopDashboard {
  active_work_orders: number;
  today_appointments: number;
  low_stock_alerts: number;
  current_month_revenue: number;
  current_month_profit: number;
  avg_profit_margin: number;
  total_clients: number;
}

export interface AiDiagnoseResult {
  diagnostic_summary: string;
  possible_causes: string[];
  recommended_labor: { description: string; estimated_hours: number; suggested_rate_per_hour: number }[];
  recommended_parts: { part_name: string; estimated_cost: number; urgency: string }[];
  technical_notes: string;
  estimated_total_cost: number;
}

export interface ServiceLog {
  id: string;
  vehicle_id: string;
  log_text: string;
  created_at: string;
}

export interface FoundRequest {
  id: string;
  owner_id: string;
  finder_id: string | null;
  vehicle_id: string;
  nfc_token_id: string | null;
  message: string;
  contact_method: string;
  finder_email: string;
  finder_phone: string;
  finder_name: string;
  status: string;
  created_at: string;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  owner_name: string;
  owner_email: string;
  owner_whatsapp: string;
}

export interface NfcTokenPublicInfo {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  type: string;
  vehicle_id: string;
  current_mileage: number | null;
  next_service_mileage: number | null;
  lubricant_brand: string;
  lubricant_type: string;
  total_services: number;
  latest_service_date: string | null;
  workshop_name: string | null;
  workshop_rating: number;
  sell_enabled: boolean;
  sell_price: string;
  sell_city: string;
  sell_zip: string;
  sell_phone: string;
  sell_description: string;
  vehicle_condition: string;
  published_at: string | null;
  owner_whatsapp: string;
  owner_name: string;
}

export type VehicleCreate = Vehicle & { plate: string; city: string };
export type VehicleUpdate = Partial<VehicleCreate>;

export type MaintenanceCreate = {
  vehicle_id: string;
  service_type: string;
  description?: string;
  mileage: number;
  date?: string;
  workshop?: string;
  workshop_id?: string;
  cost?: number;
  lubricant_brand?: string;
  lubricant_type?: string;
  next_service_mileage?: number;
};
export type MaintenanceUpdate = Partial<MaintenanceCreate>;

export type PartCreate = {
  vehicle_id: string;
  name: string;
  category?: string;
  brand?: string;
  part_number?: string;
  status?: string;
  mileage_installed?: number;
  lifespan_mileage?: number;
  notes?: string;
};
export type PartUpdate = Partial<PartCreate>;

export type CertificateCreate = {
  vehicle_id: string;
  name: string;
  issued_by?: string;
  issue_date?: string;
  expiry_date?: string;
  file_url?: string;
  cost?: number;
  notes?: string;
};
export type CertificateUpdate = Partial<CertificateCreate>;

export type DocumentCreate = {
  vehicle_id: string;
  name: string;
  type?: string;
  file_url?: string;
  notes?: string;
};
export type DocumentUpdate = Partial<DocumentCreate>;

export type GalleryCreate = {
  vehicle_id: string;
  image_url: string;
  caption?: string;
};
export type GalleryUpdate = Partial<GalleryCreate>;

export type DiagnosticCreate = {
  vehicle_id: string;
  alert_type: string;
  description: string;
  severity?: string;
};

export type ServiceLogCreate = {
  vehicle_id: string;
  log_text: string;
};

export type WorkshopUpdate = Partial<Omit<Workshop, 'id' | 'owner_id' | 'code' | 'legal_id' | 'is_verified' | 'rating' | 'created_at'>>;

export type NfcActivateRequest = {
  activation_code: string;
};

export type ProfileUpdate = Partial<Profile>;

export type UploadOut = { url: string; key: string };

// ── Panel de negocio (taller/empresa) ──
// Ver docs/PLAN_MIGRACION_TALLERPRO.md — migración de tallerpro/ hacia CarLink.

export type WorkshopMechanicCreate = {
  name: string;
  role?: string;
  specialty?: string;
  phone?: string;
  active?: boolean;
  avatar_url?: string;
};
export type WorkshopMechanicUpdate = Partial<WorkshopMechanicCreate>;

export type WorkshopServiceItemCreate = {
  name: string;
  category?: string;
  estimated_price?: number;
  estimated_hours?: number;
  description?: string;
};
export type WorkshopServiceItemUpdate = Partial<WorkshopServiceItemCreate>;

export type WorkshopClientCreate = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  document_id?: string;
};
export type WorkshopClientUpdate = Partial<WorkshopClientCreate>;

export type WorkshopVehicleCreate = {
  client_id: string;
  license_plate: string;
  brand?: string;
  model?: string;
  year?: number;
  vin?: string;
  mileage?: number;
  fuel_type?: string;
  color?: string;
  linked_vehicle_id?: string;
};
export type WorkshopVehicleUpdate = Partial<Omit<WorkshopVehicleCreate, 'client_id'>>;

export type WorkOrderLaborItemIn = {
  description: string;
  hours: number;
  rate_per_hour: number;
};

export type WorkOrderPartIn = {
  part_id?: string | null;
  part_name: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
};

export type WorkOrderCreate = {
  workshop_vehicle_id: string;
  client_id: string;
  mechanic_id?: string | null;
  estimated_completion_date?: string | null;
  status?: WorkOrderStatus | string;
  symptoms?: string;
  technical_notes?: string;
  category?: string;
  payment_method?: string;
  is_paid?: boolean;
  labor_items?: WorkOrderLaborItemIn[];
  parts_items?: WorkOrderPartIn[];
};
export type WorkOrderUpdate = Partial<WorkOrderCreate>;

export type WorkOrderPhotoEvidenceCreate = {
  url: string;
  caption?: string;
  category?: string;
  uploaded_by?: string;
};

export type WorkshopInventoryPartCreate = {
  name: string;
  sku?: string;
  category?: string;
  stock?: number;
  min_stock?: number;
  cost_price?: number;
  retail_price?: number;
  location?: string;
  compatible_models?: string[];
  last_restock_date?: string | null;
};
export type WorkshopInventoryPartUpdate = Partial<WorkshopInventoryPartCreate>;

export type AppointmentCreate = {
  client_name: string;
  client_phone?: string;
  client_email?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  service_category?: string;
  notes?: string;
  appointment_date: string;
  time_slot: string;
  duration_minutes?: number;
  status?: AppointmentStatus | string;
};
export type AppointmentUpdate = Partial<AppointmentCreate>;

export type WorkshopNotificationCreate = {
  recipient_name: string;
  recipient_phone?: string;
  recipient_email?: string;
  channel?: NotificationChannel | string;
  notification_type: string;
  message: string;
  vehicle_plate?: string;
  work_order_id?: string;
};

export type WorkshopDocumentCreate = {
  doc_type: string;
  client_name: string;
  client_tax_id?: string;
  recipient_role?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  work_order_id?: string;
  amount?: number;
  mechanic_name?: string;
  validity_months?: number;
  details?: string;
  issued_by: string;
};

export type WorkshopReviewCreate = {
  client_name: string;
  rating: number;
  comment?: string;
  vehicle_model?: string;
  is_verified_client?: boolean;
};

export type AiDiagnoseRequest = {
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_mileage?: number;
  symptoms: string;
};


// ── NFC Admin Types ──

export interface NfcTokenAdmin {
  id: string;
  user_id: string;
  vehicle_id: string;
  token_prefix: string;
  label: string;
  is_active: boolean;
  tag_uid: string | null;
  status: string;
  token_type: string;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
  user_email: string;
  user_name: string;
  vehicle_plate: string;
  vehicle_brand: string;
  qr_url: string | null;
}

export interface NfcTokenLimit {
  id: string;
  account_type: string;
  max_tokens_per_vehicle: number;
  max_daily_access: number;
  max_unique_ips_24h: number;
  updated_at: string;
}

export interface NfcAccessLog {
  id: string;
  token_id: string;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  scanned_at: string;
}

export interface NfcAlert {
  id: string;
  token_id: string;
  alert_type: string;
  severity: string;
  message: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface NfcWhitelistEntry {
  id: string;
  tag_uid: string;
  label: string;
  status: string;
  added_by: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  claimed_by_email: string;
  claimed_by_name: string;
  qr_url: string | null;
}

export interface NfcWhitelistProvisionResult {
  id: string;
  tag_uid: string;
  activation_code: string;
  token_url: string;
  qr_url: string;
}

// ── NFC Tag Inventory ──
// Raw metadata scanned off a physical keychain with an NFC reader app —
// fields mirror the reader's own export columns so pasted data (e.g. NFC
// Tools export) needs no reshaping. Kept as free text since real scans are
// inconsistent (mixed date formats, blank/repurposed columns).
export interface NfcTagInventoryCreate {
  tag_type?: string;
  technologies?: string;
  serial_number?: string | null;
  atqa?: string;
  sak?: string;
  signature?: string;
  password_protected?: string;
  memory_info?: string;
  data_format?: string;
  size_info?: string;
  writable?: string;
  read_only?: string;
  tag_content?: string;
  tag_password?: string;
  tag_created_date?: string;
  description?: string;
  linked_whitelist_id?: string | null;
}

export interface NfcTagInventoryEntry extends NfcTagInventoryCreate {
  id: string;
  created_at: string;
}

export interface NfcStats {
  total_tokens: number;
  active_tokens: number;
  total_access_today: number;
  total_alerts: number;
  unresolved_alerts: number;
  whitelist_count: number;
}