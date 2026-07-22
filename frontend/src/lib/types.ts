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

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string;
  document_number: string;
  verification_status: VerificationStatus;
  verification_doc_url: string;
  verification_note: string;
  verified_at: string | null;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
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
  created_at: string;
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

export type WorkshopUpdate = Partial<Workshop>;

export type NfcTokenCreate = {
  vehicle_id: string;
  label?: string;
};

export type ProfileUpdate = Partial<Profile>;

export type UploadOut = { url: string; key: string };