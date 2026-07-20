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
  Workshop, WorkshopUpdate,
  NfcToken, NfcTokenCreate, NfcTokenPublicInfo,
  Profile, ProfileUpdate,
  UploadOut,
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
}

export const nfcApi = {
  listTokens: () => request<NfcToken[]>('GET', '/nfc/tokens'),
  createToken: (data: NfcTokenCreate) => request<NfcToken>('POST', '/nfc/tokens', data),
  toggleActive: (id: string) => request<NfcToken>('PATCH', `/nfc/tokens/${id}/toggle`, {}),
  getPublic: (token: string) => request<NfcTokenPublicInfo>('GET', `/nfc/public/${token}`),
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
