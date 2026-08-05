import { getAccessToken } from './supabase'
import type {
  Vehicle, VehicleCreate, VehicleUpdate,
  MaintenanceRecord, MaintenanceCreate, MaintenanceUpdate,
  Part, PartCreate, PartUpdate,
  Certificate, CertificateCreate, CertificateUpdate,
  Document, DocumentCreate, DocumentUpdate,
  GalleryImage, GalleryCreate, GalleryUpdate,
  Diagnostic, DiagnosticCreate,
  ServiceLog, ServiceLogCreate,
  Workshop, WorkshopUpdate, WorkshopPublic, WorkshopDashboard,
  WorkshopMechanic, WorkshopMechanicCreate, WorkshopMechanicUpdate,
  WorkshopServiceItem, WorkshopServiceItemCreate, WorkshopServiceItemUpdate,
  WorkshopClient, WorkshopClientCreate, WorkshopClientUpdate,
  WorkshopVehicle, WorkshopVehicleCreate, WorkshopVehicleUpdate,
  WorkOrder, WorkOrderCreate, WorkOrderUpdate, WorkOrderPhotoEvidence, WorkOrderPhotoEvidenceCreate,
  WorkshopInventoryPart, WorkshopInventoryPartCreate, WorkshopInventoryPartUpdate,
  Appointment, AppointmentCreate, AppointmentUpdate,
  WorkshopNotification, WorkshopNotificationCreate,
  WorkshopDocument, WorkshopDocumentCreate,
  WorkshopReview, WorkshopReviewCreate,
  AiDiagnoseRequest, AiDiagnoseResult,
  NfcToken, NfcActivateRequest, NfcTokenPublicInfo,
  Profile, ProfileUpdate,
  UploadOut,
  NfcTokenAdmin, NfcTokenLimit, NfcAccessLog, NfcAlert, NfcWhitelistEntry, NfcWhitelistProvisionResult, NfcStats,
  NfcTagInventoryEntry, NfcTagInventoryCreate,
} from './types'

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T | null> {
  try {
    const token = await getAccessToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    let fetchBody: BodyInit | undefined
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(body)
    }
    const res = await fetch(`/api${path}`, { method, headers, body: fetchBody })
    if (!res.ok) {
      console.warn(`API ${method} ${path} -> ${res.status}`)
      return null
    }
    if (res.status === 204) return true as unknown as T
    const text = await res.text()
    return text ? (JSON.parse(text) as T) : (true as unknown as T)
  } catch (e) {
    console.warn(`API ${method} ${path} failed:`, e)
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiGet = <T = any>(path: string) => request<T>('GET', path)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiPost = <T = any>(path: string, body: unknown = {}) => request<T>('POST', path, body)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiPut = <T = any>(path: string, body: unknown = {}) => request<T>('PUT', path, body)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiPatch = <T = any>(path: string, body: unknown = {}) => request<T>('PATCH', path, body)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiDelete = <T = any>(path: string) => request<T>('DELETE', path)

export const vehicleApi = {
  list: () => request<Vehicle[]>('GET', '/vehicles'),
  get: (id: string) => request<Vehicle>('GET', `/vehicles/${id}`),
  create: (data: VehicleCreate) => request<Vehicle>('POST', '/vehicles', data),
  update: (id: string, data: VehicleUpdate) => request<Vehicle>('PUT', `/vehicles/${id}`, data),
  delete: (id: string) => request('DELETE', `/vehicles/${id}`),
  toggleNfc: (id: string) => request<Vehicle>('PATCH', `/vehicles/${id}/nfc-toggle`, {}),
}

export const maintenanceApi = {
  listByVehicle: (vehicleId: string) => request<MaintenanceRecord[]>('GET', `/maintenance/vehicle/${vehicleId}`),
  getLatest: (vehicleId: string) => request<MaintenanceRecord | null>('GET', `/maintenance/vehicle/${vehicleId}/latest`),
  create: (data: MaintenanceCreate) => request<MaintenanceRecord>('POST', '/maintenance', data),
  update: (id: string, data: MaintenanceUpdate) => request<MaintenanceRecord>('PUT', `/maintenance/${id}`, data),
  delete: (id: string) => request('DELETE', `/maintenance/${id}`),
}

export const partsApi = {
  listByVehicle: (vehicleId: string) => request<Part[]>('GET', `/parts/vehicle/${vehicleId}`),
  create: (data: PartCreate) => request<Part>('POST', '/parts', data),
  update: (id: string, data: PartUpdate) => request<Part>('PUT', `/parts/${id}`, data),
  delete: (id: string) => request('DELETE', `/parts/${id}`),
}

export const certificatesApi = {
  listByVehicle: (vehicleId: string) => request<Certificate[]>('GET', `/certificates/vehicle/${vehicleId}`),
  create: (data: CertificateCreate) => request<Certificate>('POST', '/certificates', data),
  update: (id: string, data: CertificateUpdate) => request<Certificate>('PUT', `/certificates/${id}`, data),
  delete: (id: string) => request('DELETE', `/certificates/${id}`),
}

export const documentsApi = {
  listByVehicle: (vehicleId: string) => request<Document[]>('GET', `/documents/vehicle/${vehicleId}`),
  create: (data: DocumentCreate) => request<Document>('POST', '/documents', data),
  update: (id: string, data: DocumentUpdate) => request<Document>('PUT', `/documents/${id}`, data),
  delete: (id: string) => request('DELETE', `/documents/${id}`),
}

export const galleryApi = {
  listByVehicle: (vehicleId: string) => request<GalleryImage[]>('GET', `/gallery/vehicle/${vehicleId}`),
  create: (data: GalleryCreate) => request<GalleryImage>('POST', '/gallery', data),
  update: (id: string, data: GalleryUpdate) => request<GalleryImage>('PATCH', `/gallery/${id}`, data),
  delete: (id: string) => request('DELETE', `/gallery/${id}`),
}

export const diagnosticsApi = {
  listByVehicle: (vehicleId: string) => request<Diagnostic[]>('GET', `/diagnostics/vehicle/${vehicleId}`),
  create: (data: DiagnosticCreate) => request<Diagnostic>('POST', '/diagnostics', data),
  resolve: (id: string) => request<Diagnostic>('PUT', `/diagnostics/${id}/resolve`, {}),
}

export const serviceLogsApi = {
  listByVehicle: (vehicleId: string) => request<ServiceLog[]>('GET', `/service-logs/vehicle/${vehicleId}`),
  create: (data: ServiceLogCreate) => request<ServiceLog>('POST', '/service-logs', data),
}

export const workshopApi = {
  getMe: () => request<Workshop>('GET', '/workshops/me'),
  updateMe: (data: WorkshopUpdate) => request<Workshop>('PUT', '/workshops/me', data),
  search: (q: string) => request<Workshop[]>('GET', `/workshops/search?q=${q}`),
  getDashboard: () => request<WorkshopDashboard>('GET', '/workshops/me/dashboard'),
  getPublic: (code: string) => request<WorkshopPublic>('GET', `/workshops/${code}`),
  aiDiagnose: (data: AiDiagnoseRequest) => request<AiDiagnoseResult>('POST', '/workshops/me/ai-diagnose', data),
}

// ── Panel de negocio (taller/empresa) ──
// Ver docs/PLAN_MIGRACION_TALLERPRO.md — todos requieren un workshop propio
// (POST /workshops ya hecho) y viven bajo /workshops/me/...

export const workshopMechanicsApi = {
  list: () => request<WorkshopMechanic[]>('GET', '/workshops/me/mechanics'),
  create: (data: WorkshopMechanicCreate) => request<WorkshopMechanic>('POST', '/workshops/me/mechanics', data),
  update: (id: string, data: WorkshopMechanicUpdate) => request<WorkshopMechanic>('PUT', `/workshops/me/mechanics/${id}`, data),
  delete: (id: string) => request('DELETE', `/workshops/me/mechanics/${id}`),
}

export const workshopServicesApi = {
  list: () => request<WorkshopServiceItem[]>('GET', '/workshops/me/services'),
  create: (data: WorkshopServiceItemCreate) => request<WorkshopServiceItem>('POST', '/workshops/me/services', data),
  update: (id: string, data: WorkshopServiceItemUpdate) => request<WorkshopServiceItem>('PUT', `/workshops/me/services/${id}`, data),
  delete: (id: string) => request('DELETE', `/workshops/me/services/${id}`),
}

export const workshopClientsApi = {
  list: (q?: string) => request<WorkshopClient[]>('GET', `/workshops/me/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (data: WorkshopClientCreate) => request<WorkshopClient>('POST', '/workshops/me/clients', data),
  update: (id: string, data: WorkshopClientUpdate) => request<WorkshopClient>('PUT', `/workshops/me/clients/${id}`, data),
  delete: (id: string) => request('DELETE', `/workshops/me/clients/${id}`),
}

export const workshopVehiclesApi = {
  list: (opts?: { clientId?: string; q?: string }) => {
    const params = new URLSearchParams()
    if (opts?.clientId) params.set('client_id', opts.clientId)
    if (opts?.q) params.set('q', opts.q)
    const qs = params.toString()
    return request<WorkshopVehicle[]>('GET', `/workshops/me/vehicles${qs ? `?${qs}` : ''}`)
  },
  create: (data: WorkshopVehicleCreate) => request<WorkshopVehicle>('POST', '/workshops/me/vehicles', data),
  update: (id: string, data: WorkshopVehicleUpdate) => request<WorkshopVehicle>('PUT', `/workshops/me/vehicles/${id}`, data),
  delete: (id: string) => request('DELETE', `/workshops/me/vehicles/${id}`),
}

export const workOrdersApi = {
  list: (opts?: { status?: string; clientId?: string; workshopVehicleId?: string }) => {
    const params = new URLSearchParams()
    if (opts?.status) params.set('status', opts.status)
    if (opts?.clientId) params.set('client_id', opts.clientId)
    if (opts?.workshopVehicleId) params.set('workshop_vehicle_id', opts.workshopVehicleId)
    const qs = params.toString()
    return request<WorkOrder[]>('GET', `/workshops/me/work-orders${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<WorkOrder>('GET', `/workshops/me/work-orders/${id}`),
  create: (data: WorkOrderCreate) => request<WorkOrder>('POST', '/workshops/me/work-orders', data),
  update: (id: string, data: WorkOrderUpdate) => request<WorkOrder>('PUT', `/workshops/me/work-orders/${id}`, data),
  updateStatus: (id: string, status: string) => request<WorkOrder>('PUT', `/workshops/me/work-orders/${id}/status`, { status }),
  addPhoto: (id: string, data: WorkOrderPhotoEvidenceCreate) => request<WorkOrderPhotoEvidence>('POST', `/workshops/me/work-orders/${id}/photos`, data),
}

export const workshopInventoryApi = {
  list: (lowStockOnly?: boolean) => request<WorkshopInventoryPart[]>('GET', `/workshops/me/inventory${lowStockOnly ? '?low_stock_only=true' : ''}`),
  create: (data: WorkshopInventoryPartCreate) => request<WorkshopInventoryPart>('POST', '/workshops/me/inventory', data),
  update: (id: string, data: WorkshopInventoryPartUpdate) => request<WorkshopInventoryPart>('PUT', `/workshops/me/inventory/${id}`, data),
  updateStock: (id: string, stock: number) => request<WorkshopInventoryPart>('PUT', `/workshops/me/inventory/${id}/stock`, { stock }),
  delete: (id: string) => request('DELETE', `/workshops/me/inventory/${id}`),
}

export const appointmentsApi = {
  list: (opts?: { date?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (opts?.date) params.set('date', opts.date)
    if (opts?.status) params.set('status', opts.status)
    const qs = params.toString()
    return request<Appointment[]>('GET', `/workshops/me/appointments${qs ? `?${qs}` : ''}`)
  },
  create: (data: AppointmentCreate) => request<Appointment>('POST', '/workshops/me/appointments', data),
  update: (id: string, data: AppointmentUpdate) => request<Appointment>('PUT', `/workshops/me/appointments/${id}`, data),
  delete: (id: string) => request('DELETE', `/workshops/me/appointments/${id}`),
  convert: (id: string) => request<WorkOrder>('POST', `/workshops/me/appointments/${id}/convert`, {}),
}

export const workshopNotificationsApi = {
  list: () => request<WorkshopNotification[]>('GET', '/workshops/me/notifications'),
  send: (data: WorkshopNotificationCreate) => request<WorkshopNotification>('POST', '/workshops/me/notifications', data),
}

export const workshopDocumentsApi = {
  list: (docType?: string) => request<WorkshopDocument[]>('GET', `/workshops/me/documents${docType ? `?doc_type=${encodeURIComponent(docType)}` : ''}`),
  get: (id: string) => request<WorkshopDocument>('GET', `/workshops/me/documents/${id}`),
  create: (data: WorkshopDocumentCreate) => request<WorkshopDocument>('POST', '/workshops/me/documents', data),
}

export const workshopReviewsApi = {
  list: () => request<WorkshopReview[]>('GET', '/workshops/me/reviews'),
  create: (data: WorkshopReviewCreate) => request<WorkshopReview>('POST', '/workshops/me/reviews', data),
  respond: (id: string, manager_response: string) => request<WorkshopReview>('PUT', `/workshops/me/reviews/${id}/respond`, { manager_response }),
}

export const nfcApi = {
  listTokens: () => request<NfcToken[]>('GET', '/nfc/tokens'),
  toggleActive: (id: string) => request<NfcToken>('PATCH', `/nfc/tokens/${id}/toggle`, {}),
  getPublic: (token: string) => request<NfcTokenPublicInfo>('GET', `/nfc/public/${token}`),
}

// Bypasses the generic `request()` helper because activation failures need
// to surface the backend's specific reason ("Código inválido o ya
// utilizado.", rate limit, etc.) instead of a generic null.
export async function activateNfcCode(activation_code: NfcActivateRequest['activation_code']): Promise<{ data: NfcToken | null; error: string | null }> {
  try {
    const token = await getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/nfc/activate', { method: 'POST', headers, body: JSON.stringify({ activation_code }) })
    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    if (!res.ok) return { data: null, error: body.detail || 'No se pudo activar el llavero.' }
    return { data: body as NfcToken, error: null }
  } catch {
    return { data: null, error: 'No se pudo activar el llavero. Intenta de nuevo.' }
  }
}

export const uploadApi = {
  upload: async (file: File, folder: string): Promise<UploadOut | null> => {
    try {
      const token = await getAccessToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch('/api/upload', { method: 'POST', headers, body: formData })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },
}

export const profileApi = {
  getMe: () => request<Profile>('GET', '/auth/me'),
  updateMe: (data: ProfileUpdate) => request<Profile>('PUT', '/auth/me', data),
}

export const authApi = {
  googleLogin: () => request<{ url: string }>('GET', '/auth/google'),
}

export interface JobApplication {
  id: string
  full_name: string
  email: string
  phone: string
  area: string
  message: string | null
  cv_url: string | null
  offer_title: string | null
  status: string
  created_at: string
}

export const jobApplicationApi = {
  create: (data: { full_name: string; email: string; phone: string; area: string; message?: string; cv_url?: string; offer_title?: string }) =>
    request<JobApplication>('POST', '/job-applications', data),
  list: () => request<JobApplication[]>('GET', '/job-applications'),
  updateStatus: (id: string, status: string) =>
    request<JobApplication>('PATCH', `/job-applications/${id}`, { status }),
}

export const adminApi = {
  stats: () => request<NfcStats>('GET', '/admin/nfc/stats'),
  listTokens: (status?: string) => request<NfcTokenAdmin[]>('GET', `/admin/nfc/tokens${status ? `?status=${status}` : ''}`),
  updateToken: (id: string, data: Partial<NfcTokenAdmin>) => request<NfcTokenAdmin>('PATCH', `/admin/nfc/tokens/${id}`, data),
  revokeToken: (id: string) => request('DELETE', `/admin/nfc/tokens/${id}`),
  getTokenLogs: (id: string) => request<NfcAccessLog[]>('GET', `/admin/nfc/tokens/${id}/logs`),
  listAlerts: (resolved?: boolean) => request<NfcAlert[]>('GET', `/admin/nfc/alerts${resolved !== undefined ? `?resolved=${resolved}` : ''}`),
  resolveAlert: (id: string, resolved: boolean) => request<NfcAlert>('PATCH', `/admin/nfc/alerts/${id}/resolve`, { resolved }),
  listWhitelist: () => request<NfcWhitelistEntry[]>('GET', '/admin/nfc/whitelist'),
  addToWhitelist: (tag_uid: string, label?: string) => request<NfcWhitelistEntry>('POST', '/admin/nfc/whitelist', { tag_uid, label: label || '' }),
  bulkWhitelist: (entries: { tag_uid: string; label?: string }[]) => request<NfcWhitelistEntry[]>('POST', '/admin/nfc/whitelist/bulk', { entries }),
  provisionWhitelist: (tag_uid: string, label?: string) => request<NfcWhitelistProvisionResult>('POST', '/admin/nfc/whitelist/provision', { tag_uid, label: label || '' }),
  removeFromWhitelist: (id: string) => request('DELETE', `/admin/nfc/whitelist/${id}`),
  listLimits: () => request<NfcTokenLimit[]>('GET', '/admin/nfc/limits'),
  updateLimit: (accountType: string, data: Partial<NfcTokenLimit>) => request<NfcTokenLimit>('PATCH', `/admin/nfc/limits/${accountType}`, data),
  listInventory: () => request<NfcTagInventoryEntry[]>('GET', '/admin/nfc/inventory'),
  createInventory: (data: NfcTagInventoryCreate) => request<NfcTagInventoryEntry>('POST', '/admin/nfc/inventory', data),
  bulkCreateInventory: (entries: NfcTagInventoryCreate[]) => request<NfcTagInventoryEntry[]>('POST', '/admin/nfc/inventory/bulk', { entries }),
  deleteInventory: (id: string) => request('DELETE', `/admin/nfc/inventory/${id}`),
}
