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
  VehicleInvoice,
  WorkshopReview, WorkshopReviewCreate,
  AiDiagnoseRequest, AiDiagnoseResult, AiNotificationRequest, AiNotificationResult,
  NfcToken, NfcActivateRequest, NfcTokenPublicInfo,
  Profile, ProfileUpdate,
  UploadOut,
  NfcTokenAdmin, NfcTokenLimit, NfcAccessLog, NfcAlert, NfcWhitelistEntry, NfcWhitelistProvisionResult, NfcStats,
  NfcTagInventoryEntry, NfcTagInventoryCreate,
  ShopOrderDetail, ShopOrderStats,
  PartnerMe, PartnerProvisionResult, PartnerBatch, PartnerToken, PartnerAdminView, PartnerCreateResult,
  VehicleExpense, ExpenseCreate, ExpenseUpdate, FuelSummary,
  ReviewCreate, ReviewSubmit, Review, ReviewSummary, ReviewTargetType, AdminReview, AdminReviewSummary,
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
  // Cuántos llaveros comprados (shop_orders aprobados) todavía no se usaron
  // para activar un vehículo — gatea el botón "Agregar vehículo" en FichaTab.
  keychainAvailability: () => request<{ available: number }>('GET', '/vehicles/keychain-availability'),
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

export const vehicleInvoicesApi = {
  listByVehicle: (vehicleId: string) => request<VehicleInvoice[]>('GET', `/invoices/vehicle/${vehicleId}`),
}

export const expensesApi = {
  listByVehicle: (vehicleId: string, category?: string) => {
    const params = category ? `?category=${category}` : ''
    return request<VehicleExpense[]>('GET', `/expenses/vehicle/${vehicleId}${params}`)
  },
  get: (id: string) => request<VehicleExpense>('GET', `/expenses/${id}`),
  create: (data: ExpenseCreate) => request<VehicleExpense>('POST', '/expenses', data),
  update: (id: string, data: ExpenseUpdate) => request<VehicleExpense>('PUT', `/expenses/${id}`, data),
  delete: (id: string) => request('DELETE', `/expenses/${id}`),
  fuelSummary: (vehicleId: string) => request<FuelSummary>('GET', `/expenses/vehicle/${vehicleId}/fuel-summary`),
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
  aiImproveNotification: (data: AiNotificationRequest) => request<AiNotificationResult>('POST', '/workshops/me/ai-notification-message', data),
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
  /** Busca por la placa ya cargada — nunca por un `linked_vehicle_id` a
   * mano. docs/PLAN_FACTURACION_AUTOMATICA.md Paso 3. */
  link: (id: string) => request<WorkshopVehicle>('POST', `/workshops/me/vehicles/${id}/link`),
  unlink: (id: string) => request<WorkshopVehicle>('POST', `/workshops/me/vehicles/${id}/unlink`),
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

// Servicio único de reseñas (plataforma / producto / taller), llamado desde
// distintos puntos de la app — ver ResenasTab. mine=true trae las 3 propias del
// usuario logueado (incluida la de taller, que en el backend vive en workshop_reviews).
export const reviewsApi = {
  create: (data: ReviewCreate) => request<ReviewSubmit>('POST', '/reviews', data),
  mine: () => request<ReviewSubmit[]>('GET', '/reviews?mine=true'),
  list: (opts: { targetType: ReviewTargetType; minRating?: number; sort?: 'recientes' | 'mejores' | 'peores'; limit?: number }) => {
    const params = new URLSearchParams({ target_type: opts.targetType })
    if (opts.minRating) params.set('min_rating', String(opts.minRating))
    if (opts.sort) params.set('sort', opts.sort)
    if (opts.limit) params.set('limit', String(opts.limit))
    return request<Review[]>('GET', `/reviews?${params.toString()}`)
  },
  summary: (targetType: ReviewTargetType) => request<ReviewSummary>('GET', `/reviews/summary?target_type=${targetType}`),
}

export const adminReviewsApi = {
  list: (opts?: { targetType?: ReviewTargetType; workshopId?: string; minRating?: number; sort?: 'recientes' | 'mejores' | 'peores' }) => {
    const params = new URLSearchParams()
    if (opts?.targetType) params.set('target_type', opts.targetType)
    if (opts?.workshopId) params.set('workshop_id', opts.workshopId)
    if (opts?.minRating) params.set('min_rating', String(opts.minRating))
    if (opts?.sort) params.set('sort', opts.sort)
    const qs = params.toString()
    return request<AdminReview[]>('GET', `/admin/reviews${qs ? `?${qs}` : ''}`)
  },
  summary: (targetType?: ReviewTargetType) =>
    request<AdminReviewSummary>('GET', `/admin/reviews/summary${targetType ? `?target_type=${targetType}` : ''}`),
}

export const nfcApi = {
  listTokens: () => request<NfcToken[]>('GET', '/nfc/tokens'),
  toggleActive: (id: string) => request<NfcToken>('PATCH', `/nfc/tokens/${id}/toggle`, {}),
  getPublic: (token: string) => request<NfcTokenPublicInfo>('GET', `/nfc/public/${token}`),
}

// Bypasses the generic `request()` helper because activation failures need
// to surface the backend's specific reason ("Código inválido o ya
// utilizado.", rate limit, etc.) instead of a generic null.
export async function activateNfcCode(activation_code: NfcActivateRequest['activation_code'], vehicle_id: NfcActivateRequest['vehicle_id']): Promise<{ data: NfcToken | null; error: string | null }> {
  try {
    const token = await getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/nfc/activate', { method: 'POST', headers, body: JSON.stringify({ activation_code, vehicle_id }) })
    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    if (!res.ok) return { data: null, error: body.detail || 'No se pudo activar el llavero.' }
    return { data: body as NfcToken, error: null }
  } catch {
    return { data: null, error: 'No se pudo activar el llavero. Intenta de nuevo.' }
  }
}

// Igual motivo que activateNfcCode — provisionar puede fallar por varias
// razones distintas ahora que admite asignar a un partner (cupo agotado,
// partner suspendido, UID duplicado) y el mensaje genérico ya no alcanza.
export async function adminProvisionWhitelist(tag_uid: string, label: string, partner_id?: string): Promise<{ data: NfcWhitelistProvisionResult | null; error: string | null }> {
  try {
    const token = await getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/admin/nfc/whitelist/provision', {
      method: 'POST', headers, body: JSON.stringify({ tag_uid, label, partner_id: partner_id || null }),
    })
    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    if (!res.ok) return { data: null, error: body.detail || 'No se pudo provisionar el llavero.' }
    return { data: body as NfcWhitelistProvisionResult, error: null }
  } catch {
    return { data: null, error: 'No se pudo provisionar el llavero. Intenta de nuevo.' }
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export const uploadApi = {
  upload: async (file: File, folder: string): Promise<UploadOut | null> => {
    try {
      const token = await getAccessToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', headers, body: formData })
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

export interface WaitlistLead {
  id: string
  contact: string
  source: string
  notified: boolean
  notified_at: string | null
  created_at: string
}

export const waitlistApi = {
  create: (contact: string, source = 'landing') =>
    request<WaitlistLead>('POST', '/waitlist', { contact, source }),
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
  removeFromWhitelist: (id: string) => request('DELETE', `/admin/nfc/whitelist/${id}`),
  listLimits: () => request<NfcTokenLimit[]>('GET', '/admin/nfc/limits'),
  updateLimit: (accountType: string, data: Partial<NfcTokenLimit>) => request<NfcTokenLimit>('PATCH', `/admin/nfc/limits/${accountType}`, data),
  listInventory: () => request<NfcTagInventoryEntry[]>('GET', '/admin/nfc/inventory'),
  createInventory: (data: NfcTagInventoryCreate) => request<NfcTagInventoryEntry>('POST', '/admin/nfc/inventory', data),
  bulkCreateInventory: (entries: NfcTagInventoryCreate[]) => request<NfcTagInventoryEntry[]>('POST', '/admin/nfc/inventory/bulk', { entries }),
  deleteInventory: (id: string) => request('DELETE', `/admin/nfc/inventory/${id}`),
  // Cola de despacho del checkout de Wompi — modo administrador (ve las órdenes
  // de todo el mundo). El modo cliente ("Mis pedidos") usa shopOrderApi.list().
  listAllShopOrders: () => request<ShopOrderDetail[]>('GET', '/shop/admin/orders'),
  shopOrderStats: () => request<ShopOrderStats>('GET', '/shop/admin/stats'),
  markShopOrderShipped: (reference: string, tracking_note: string) =>
    request<ShopOrderDetail>('PATCH', `/shop/orders/${reference}/fulfillment`, { status: 'shipped', tracking_note }),
  markShopOrderDelivered: (reference: string) =>
    request<ShopOrderDetail>('PATCH', `/shop/orders/${reference}/fulfillment`, { status: 'delivered' }),
  // Cierra el ciclo de un pedido contraentrega (payment_method='cod') — el
  // backend rechaza esto si el pedido es 'wompi' (esos solo los aprueba la
  // confirmación real de la pasarela).
  markShopOrderPaid: (reference: string) =>
    request<ShopOrderDetail>('POST', `/shop/orders/${reference}/mark-paid`),
  // Partners (rol de aprovisionamiento escopeado) — el admin real crea/gestiona
  // partners con su sesión normal; el partner en sí opera aparte con su api
  // key (ver partnerApi más abajo, sin sesión de Supabase).
  createPartner: (data: { name: string; contact_email: string; contact_phone?: string; quota_total: number; notes?: string }) =>
    request<PartnerCreateResult>('POST', '/admin/nfc/partners', data),
  listPartners: () => request<PartnerAdminView[]>('GET', '/admin/nfc/partners'),
  updatePartner: (id: string, data: { quota_total?: number; status?: string; notes?: string }) =>
    request<PartnerAdminView>('PATCH', `/admin/nfc/partners/${id}`, data),
  partnerBatches: (id: string) => request<PartnerBatch[]>('GET', `/admin/nfc/partners/${id}/batches`),
}

// "Mis pedidos" — modo cliente, siempre las órdenes propias de quien pregunta
// (ver adminApi.listAllShopOrders para la cola completa en modo administrador).
export const shopOrderApi = {
  list: () => request<ShopOrderDetail[]>('GET', '/shop/orders'),
}

// ── Partner (rol de aprovisionamiento escopeado) ──
// El panel /partner en sí se autentica con una api key propia (no una
// sesión de Supabase), así que no usa el helper request() de arriba (que
// siempre intenta adjuntar el token de sesión) — tiene su propio fetch
// mínimo con X-Partner-Api-Key.
async function partnerRequest<T = unknown>(method: string, path: string, apiKey: string, body?: unknown): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers: Record<string, string> = { 'X-Partner-Api-Key': apiKey }
    let fetchBody: BodyInit | undefined
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(body)
    }
    const res = await fetch(`/api${path}`, { method, headers, body: fetchBody })
    const text = await res.text()
    const parsed = text ? JSON.parse(text) : null
    if (!res.ok) return { data: null, error: (parsed && parsed.detail) || `Error ${res.status}` }
    return { data: parsed as T, error: null }
  } catch {
    return { data: null, error: 'No se pudo conectar con el servidor.' }
  }
}

export const partnerApi = {
  me: (apiKey: string) => partnerRequest<PartnerMe>('GET', '/partners/me', apiKey),
  provision: (apiKey: string, quantity: number, batch_note: string) =>
    partnerRequest<PartnerProvisionResult>('POST', '/partners/me/provision', apiKey, { quantity, batch_note }),
  batches: (apiKey: string) => partnerRequest<PartnerBatch[]>('GET', '/partners/me/batches', apiKey),
  // Control estricto por llavero (docs/PLAN_PARTNER_MODEL.md) — qr_url no es
  // de un solo uso, así que se puede volver a pedir cuando haga falta.
  tokens: (apiKey: string, batchId?: string) =>
    partnerRequest<PartnerToken[]>('GET', `/partners/me/tokens${batchId ? `?batch_id=${batchId}` : ''}`, apiKey),
}
