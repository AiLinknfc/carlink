export interface Vehicle {
  id: string
  owner_id: string
  plate: string
  city: string
  brand: string
  model: string
  year: number
  type: string
  color: string
  image_url: string
  nfc_active: boolean
  created_at: string
  updated_at: string
}

export interface MaintenanceRecord {
  id: string
  vehicle_id: string
  workshop_id: string | null
  service_type: string
  description: string
  mileage: number
  date: string
  workshop: string
  cost: number
  lubricant_brand: string
  lubricant_type: string
  next_service_mileage: number | null
  created_at: string
  updated_at: string
}

export interface Part {
  id: string
  vehicle_id: string
  name: string
  brand: string
  part_number: string
  status: string
  mileage_installed: number | null
  lifespan_mileage: number | null
  notes: string
  created_at: string
  updated_at: string
}

export interface Certificate {
  id: string
  vehicle_id: string
  name: string
  issued_by: string
  issue_date: string | null
  expiry_date: string | null
  file_url: string
  cost: number | null
  notes: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  vehicle_id: string
  name: string
  type: string
  file_url: string
  notes: string
  created_at: string
  updated_at: string
}

export interface DocumentEnhanced extends Document {
  status: DocumentStatus
  expires_at: string | null
  doc_number: string
}

export type DocumentStatus = 'vigente' | 'por_vencer' | 'vencido' | 'pendiente'

export interface GalleryImage {
  id: string
  vehicle_id: string
  image_url: string
  caption: string
  sort_order: number
  created_at: string
}

export interface Diagnostic {
  id: string
  vehicle_id: string
  alert_type: string
  description: string
  severity: string
  resolved: boolean
  created_at: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  account_type: string
  created_at: string
}

export interface NfcToken {
  id: string
  vehicle_id: string
  token_prefix: string
  label: string
  is_active: boolean
  last_accessed_at: string | null
  access_count: number
  created_at: string
}

export interface Workshop {
  id: string
  owner_id: string
  legal_id: string
  code: string
  name: string
  address: string
  city: string
  phone: string
  description: string
  is_verified: boolean
  created_at: string
}

export interface ServiceLog {
  id: string
  vehicle_id: string
  log_text: string
  created_at: string
}

export interface ColorPresets {
  bg: string
  muted: string
  ink: string
  soft: string
  chipBg: string
  chip: string
  border: string
}
