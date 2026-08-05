import { useState, useEffect, useCallback, useRef } from 'react'
import {
  vehicleApi,
  maintenanceApi,
  partsApi,
  certificatesApi,
  documentsApi,
  galleryApi,
  diagnosticsApi,
  serviceLogsApi,
  workshopApi,
  workshopMechanicsApi,
  workshopServicesApi,
  workshopClientsApi,
  workshopVehiclesApi,
  workOrdersApi,
  workshopInventoryApi,
  appointmentsApi,
  workshopNotificationsApi,
  workshopDocumentsApi,
  workshopReviewsApi,
  nfcApi,
  uploadApi,
  profileApi,
  authApi,
} from './api'
import type {
  Vehicle,
  MaintenanceRecord,
  Part,
  Certificate,
  Document,
  GalleryImage,
  Diagnostic,
  NfcToken,
  Workshop,
  WorkshopMechanic,
  WorkshopServiceItem,
  WorkshopClient,
  WorkshopVehicle,
  WorkOrder,
  WorkshopInventoryPart,
  Appointment,
  WorkshopNotification,
  WorkshopDocument,
  WorkshopReview,
  WorkshopDashboard,
  ServiceLog,
  Profile,
} from './types'

export function useVehicle(vehicleId: string | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await vehicleApi.get(vehicleId)
      setVehicle(data)
    } catch (e) {
      console.error('Failed to load vehicle:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  return { vehicle, loading, reload: load }
}

export function useMaintenance(vehicleId: string | undefined, refreshKey?: number) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [latest, setLatest] = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [recordsData, latestData] = await Promise.all([
        maintenanceApi.listByVehicle(vehicleId),
        maintenanceApi.getLatest(vehicleId),
      ])
      setRecords((recordsData || []).sort((a: any, b: any) => (b.mileage ?? 0) - (a.mileage ?? 0)))
      setLatest(latestData)
    } catch (e) {
      console.error('Failed to load maintenance:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId, refreshKey])

  useEffect(() => {
    load()
  }, [load])

  const addRecord = useCallback(
    async (data: Parameters<typeof maintenanceApi.create>[0]) => {
      const result = await maintenanceApi.create(data)
      if (result) await load()
      return result
    },
    [load]
  )

  const updateRecord = useCallback(
    async (id: string, data: Parameters<typeof maintenanceApi.update>[1]) => {
      const result = await maintenanceApi.update(id, data)
      if (result) await load()
      return result
    },
    [load]
  )

  const deleteRecord = useCallback(
    async (id: string) => {
      const ok = await maintenanceApi.delete(id)
      if (ok) await load()
      return ok
    },
    [load]
  )

  return { records, latest, loading, reload: load, addRecord, updateRecord, deleteRecord }
}

export function useParts(vehicleId: string | undefined) {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await partsApi.listByVehicle(vehicleId)
      setParts(data || [])
    } catch (e) {
      console.error('Failed to load parts:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const addPart = useCallback(
    async (data: Parameters<typeof partsApi.create>[0]) => {
      const result = await partsApi.create(data)
      if (result) await load()
      return result
    },
    [load]
  )

  const updatePart = useCallback(
    async (id: string, data: Parameters<typeof partsApi.update>[1]) => {
      const result = await partsApi.update(id, data)
      if (result) await load()
      return result
    },
    [load]
  )

  const deletePart = useCallback(
    async (id: string) => {
      const ok = await partsApi.delete(id)
      if (ok) await load()
      return ok
    },
    [load]
  )

  return { parts, loading, reload: load, addPart, updatePart, deletePart }
}

export function useGallery(vehicleId: string | undefined) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await galleryApi.listByVehicle(vehicleId)
      setImages(data || [])
    } catch (e) {
      console.error('Failed to load gallery:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const addImage = useCallback(
    async (data: Parameters<typeof galleryApi.create>[0]) => {
      const result = await galleryApi.create(data)
      if (result) await load()
      return result
    },
    [load]
  )

  const updateImage = useCallback(
    async (id: string, data: Parameters<typeof galleryApi.update>[1]) => {
      const result = await galleryApi.update(id, data)
      if (result) await load()
      return result
    },
    [load]
  )

  const deleteImage = useCallback(
    async (id: string) => {
      const ok = await galleryApi.delete(id)
      if (ok) await load()
      return ok
    },
    [load]
  )

  return { images, loading, reload: load, addImage, updateImage, deleteImage }
}

export function useCertificates(vehicleId: string | undefined) {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await certificatesApi.listByVehicle(vehicleId)
      setCertificates(data || [])
    } catch (e) {
      console.error('Failed to load certificates:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const addCertificate = useCallback(
    async (data: Parameters<typeof certificatesApi.create>[0]) => {
      const result = await certificatesApi.create(data)
      if (result) await load()
      return result
    },
    [load]
  )

  const updateCertificate = useCallback(
    async (id: string, data: Parameters<typeof certificatesApi.update>[1]) => {
      const result = await certificatesApi.update(id, data)
      if (result) await load()
      return result
    },
    [load]
  )

  const deleteCertificate = useCallback(
    async (id: string) => {
      const ok = await certificatesApi.delete(id)
      if (ok) await load()
      return ok
    },
    [load]
  )

  return { certificates, loading, reload: load, addCertificate, updateCertificate, deleteCertificate }
}

export function useDocuments(vehicleId: string | undefined) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await documentsApi.listByVehicle(vehicleId)
      setDocuments(data || [])
    } catch (e) {
      console.error('Failed to load documents:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const addDocument = useCallback(
    async (data: Parameters<typeof documentsApi.create>[0]) => {
      const result = await documentsApi.create(data)
      if (result) await load()
      return result
    },
    [load]
  )

  const updateDocument = useCallback(
    async (id: string, data: Parameters<typeof documentsApi.update>[1]) => {
      const result = await documentsApi.update(id, data)
      if (result) await load()
      return result
    },
    [load]
  )

  const deleteDocument = useCallback(
    async (id: string) => {
      const ok = await documentsApi.delete(id)
      if (ok) await load()
      return ok
    },
    [load]
  )

  return { documents, loading, reload: load, addDocument, updateDocument, deleteDocument }
}

export function useDiagnostics(vehicleId: string | undefined) {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await diagnosticsApi.listByVehicle(vehicleId)
      setDiagnostics(data || [])
    } catch (e) {
      console.error('Failed to load diagnostics:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const addDiagnostic = useCallback(
    async (data: Parameters<typeof diagnosticsApi.create>[0]) => {
      const result = await diagnosticsApi.create(data)
      if (result) await load()
      return result
    },
    [load]
  )

  const resolveDiagnostic = useCallback(
    async (id: string) => {
      const result = await diagnosticsApi.resolve(id)
      if (result) await load()
      return result
    },
    [load]
  )

  return { diagnostics, loading, reload: load, addDiagnostic, resolveDiagnostic }
}

export function useNfcTokens() {
  const [tokens, setTokens] = useState<NfcToken[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await nfcApi.listTokens()
      setTokens(data || [])
    } catch (e) {
      console.error('Failed to load NFC tokens:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { tokens, loading, reload: load }
}

export function useCountdown(deadline: number | null) {
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0 })
  const targetRef = useRef<number | null>(null)

  useEffect(() => {
    if (deadline == null || deadline === targetRef.current) return
    targetRef.current = deadline
    function tick() {
      const diff = Math.max(0, deadline! - Date.now())
      setCd({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])
  return cd
}

export function useWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await workshopApi.search('')
      setWorkshops(data || [])
    } catch (e) {
      console.error('Failed to load workshops:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { workshops, loading, reload: load }
}

/** El taller/empresa propio de la cuenta autenticada (GET /workshops/me) —
 * distinto de useWorkshops(), que busca en el directorio público. Base del
 * panel de negocio en /app/negocio (docs/PLAN_MIGRACION_TALLERPRO.md). */
export function useMyWorkshop() {
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setWorkshop(await workshopApi.getMe())
    } catch (e) {
      console.error('Failed to load my workshop:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateWorkshop = useCallback(async (data: Parameters<typeof workshopApi.updateMe>[0]) => {
    const result = await workshopApi.updateMe(data)
    if (result) setWorkshop(result)
    return result
  }, [])

  return { workshop, loading, reload: load, updateWorkshop }
}

export function useServiceLogs(vehicleId: string | undefined) {
  const [logs, setLogs] = useState<ServiceLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await serviceLogsApi.listByVehicle(vehicleId)
      setLogs(data || [])
    } catch (e) {
      console.error('Failed to load service logs:', e)
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  return { logs, loading, reload: load }
}

// ── Panel de negocio (taller/empresa) ──
// Ver docs/PLAN_MIGRACION_TALLERPRO.md — todos escopeados al taller de la
// cuenta autenticada (sin vehicleId), mismo patrón load/reload que el resto
// de hooks de este archivo.

export function useWorkshopDashboard() {
  const [dashboard, setDashboard] = useState<WorkshopDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await workshopApi.getDashboard()
      setDashboard(data)
    } catch (e) {
      console.error('Failed to load workshop dashboard:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { dashboard, loading, reload: load }
}

export function useWorkshopMechanics() {
  const [mechanics, setMechanics] = useState<WorkshopMechanic[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMechanics((await workshopMechanicsApi.list()) || [])
    } catch (e) {
      console.error('Failed to load mechanics:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addMechanic = useCallback(async (data: Parameters<typeof workshopMechanicsApi.create>[0]) => {
    const result = await workshopMechanicsApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const updateMechanic = useCallback(async (id: string, data: Parameters<typeof workshopMechanicsApi.update>[1]) => {
    const result = await workshopMechanicsApi.update(id, data)
    if (result) await load()
    return result
  }, [load])

  const deleteMechanic = useCallback(async (id: string) => {
    const ok = await workshopMechanicsApi.delete(id)
    if (ok) await load()
    return ok
  }, [load])

  return { mechanics, loading, reload: load, addMechanic, updateMechanic, deleteMechanic }
}

export function useWorkshopServices() {
  const [services, setServices] = useState<WorkshopServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setServices((await workshopServicesApi.list()) || [])
    } catch (e) {
      console.error('Failed to load service catalog:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addService = useCallback(async (data: Parameters<typeof workshopServicesApi.create>[0]) => {
    const result = await workshopServicesApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const updateService = useCallback(async (id: string, data: Parameters<typeof workshopServicesApi.update>[1]) => {
    const result = await workshopServicesApi.update(id, data)
    if (result) await load()
    return result
  }, [load])

  const deleteService = useCallback(async (id: string) => {
    const ok = await workshopServicesApi.delete(id)
    if (ok) await load()
    return ok
  }, [load])

  return { services, loading, reload: load, addService, updateService, deleteService }
}

export function useWorkshopClients(q?: string) {
  const [clients, setClients] = useState<WorkshopClient[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setClients((await workshopClientsApi.list(q)) || [])
    } catch (e) {
      console.error('Failed to load clients:', e)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const addClient = useCallback(async (data: Parameters<typeof workshopClientsApi.create>[0]) => {
    const result = await workshopClientsApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const updateClient = useCallback(async (id: string, data: Parameters<typeof workshopClientsApi.update>[1]) => {
    const result = await workshopClientsApi.update(id, data)
    if (result) await load()
    return result
  }, [load])

  const deleteClient = useCallback(async (id: string) => {
    const ok = await workshopClientsApi.delete(id)
    if (ok) await load()
    return ok
  }, [load])

  return { clients, loading, reload: load, addClient, updateClient, deleteClient }
}

export function useWorkshopVehicles(opts?: { clientId?: string; q?: string }) {
  const [vehicles, setVehicles] = useState<WorkshopVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const clientId = opts?.clientId
  const q = opts?.q

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setVehicles((await workshopVehiclesApi.list({ clientId, q })) || [])
    } catch (e) {
      console.error('Failed to load workshop vehicles:', e)
    } finally {
      setLoading(false)
    }
  }, [clientId, q])

  useEffect(() => { load() }, [load])

  const addVehicle = useCallback(async (data: Parameters<typeof workshopVehiclesApi.create>[0]) => {
    const result = await workshopVehiclesApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const updateVehicle = useCallback(async (id: string, data: Parameters<typeof workshopVehiclesApi.update>[1]) => {
    const result = await workshopVehiclesApi.update(id, data)
    if (result) await load()
    return result
  }, [load])

  const deleteVehicle = useCallback(async (id: string) => {
    const ok = await workshopVehiclesApi.delete(id)
    if (ok) await load()
    return ok
  }, [load])

  return { vehicles, loading, reload: load, addVehicle, updateVehicle, deleteVehicle }
}

export function useWorkOrders(opts?: { status?: string; clientId?: string; workshopVehicleId?: string }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const status = opts?.status
  const clientId = opts?.clientId
  const workshopVehicleId = opts?.workshopVehicleId

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setWorkOrders((await workOrdersApi.list({ status, clientId, workshopVehicleId })) || [])
    } catch (e) {
      console.error('Failed to load work orders:', e)
    } finally {
      setLoading(false)
    }
  }, [status, clientId, workshopVehicleId])

  useEffect(() => { load() }, [load])

  const addWorkOrder = useCallback(async (data: Parameters<typeof workOrdersApi.create>[0]) => {
    const result = await workOrdersApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const updateWorkOrder = useCallback(async (id: string, data: Parameters<typeof workOrdersApi.update>[1]) => {
    const result = await workOrdersApi.update(id, data)
    if (result) await load()
    return result
  }, [load])

  const updateWorkOrderStatus = useCallback(async (id: string, status: string) => {
    const result = await workOrdersApi.updateStatus(id, status)
    if (result) await load()
    return result
  }, [load])

  return { workOrders, loading, reload: load, addWorkOrder, updateWorkOrder, updateWorkOrderStatus }
}

export function useWorkshopInventory(lowStockOnly?: boolean) {
  const [parts, setParts] = useState<WorkshopInventoryPart[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setParts((await workshopInventoryApi.list(lowStockOnly)) || [])
    } catch (e) {
      console.error('Failed to load workshop inventory:', e)
    } finally {
      setLoading(false)
    }
  }, [lowStockOnly])

  useEffect(() => { load() }, [load])

  const addPart = useCallback(async (data: Parameters<typeof workshopInventoryApi.create>[0]) => {
    const result = await workshopInventoryApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const updatePart = useCallback(async (id: string, data: Parameters<typeof workshopInventoryApi.update>[1]) => {
    const result = await workshopInventoryApi.update(id, data)
    if (result) await load()
    return result
  }, [load])

  const updateStock = useCallback(async (id: string, stock: number) => {
    const result = await workshopInventoryApi.updateStock(id, stock)
    if (result) await load()
    return result
  }, [load])

  const deletePart = useCallback(async (id: string) => {
    const ok = await workshopInventoryApi.delete(id)
    if (ok) await load()
    return ok
  }, [load])

  return { parts, loading, reload: load, addPart, updatePart, updateStock, deletePart }
}

export function useAppointments(opts?: { date?: string; status?: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const date = opts?.date
  const status = opts?.status

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAppointments((await appointmentsApi.list({ date, status })) || [])
    } catch (e) {
      console.error('Failed to load appointments:', e)
    } finally {
      setLoading(false)
    }
  }, [date, status])

  useEffect(() => { load() }, [load])

  const addAppointment = useCallback(async (data: Parameters<typeof appointmentsApi.create>[0]) => {
    const result = await appointmentsApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const updateAppointment = useCallback(async (id: string, data: Parameters<typeof appointmentsApi.update>[1]) => {
    const result = await appointmentsApi.update(id, data)
    if (result) await load()
    return result
  }, [load])

  const deleteAppointment = useCallback(async (id: string) => {
    const ok = await appointmentsApi.delete(id)
    if (ok) await load()
    return ok
  }, [load])

  const convertAppointment = useCallback(async (id: string) => {
    const result = await appointmentsApi.convert(id)
    if (result) await load()
    return result
  }, [load])

  return { appointments, loading, reload: load, addAppointment, updateAppointment, deleteAppointment, convertAppointment }
}

export function useWorkshopNotifications() {
  const [notifications, setNotifications] = useState<WorkshopNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setNotifications((await workshopNotificationsApi.list()) || [])
    } catch (e) {
      console.error('Failed to load notifications:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sendNotification = useCallback(async (data: Parameters<typeof workshopNotificationsApi.send>[0]) => {
    const result = await workshopNotificationsApi.send(data)
    if (result) await load()
    return result
  }, [load])

  return { notifications, loading, reload: load, sendNotification }
}

export function useWorkshopDocuments(docType?: string) {
  const [documents, setDocuments] = useState<WorkshopDocument[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setDocuments((await workshopDocumentsApi.list(docType)) || [])
    } catch (e) {
      console.error('Failed to load documents:', e)
    } finally {
      setLoading(false)
    }
  }, [docType])

  useEffect(() => { load() }, [load])

  const createDocument = useCallback(async (data: Parameters<typeof workshopDocumentsApi.create>[0]) => {
    const result = await workshopDocumentsApi.create(data)
    if (result) await load()
    return result
  }, [load])

  return { documents, loading, reload: load, createDocument }
}

export function useWorkshopReviews() {
  const [reviews, setReviews] = useState<WorkshopReview[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setReviews((await workshopReviewsApi.list()) || [])
    } catch (e) {
      console.error('Failed to load reviews:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addReview = useCallback(async (data: Parameters<typeof workshopReviewsApi.create>[0]) => {
    const result = await workshopReviewsApi.create(data)
    if (result) await load()
    return result
  }, [load])

  const respondReview = useCallback(async (id: string, response: string) => {
    const result = await workshopReviewsApi.respond(id, response)
    if (result) await load()
    return result
  }, [load])

  return { reviews, loading, reload: load, addReview, respondReview }
}

export function useUpload() {
  const uploadFile = useCallback(
    async (file: File, folder: string) => {
      const result = await uploadApi.upload(file, folder)
      return result?.url ?? null
    },
    []
  )

  return { uploadFile }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await profileApi.getMe()
      setProfile(data)
    } catch (e) {
      console.error('Failed to load profile:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateProfile = useCallback(
    async (data: Parameters<typeof profileApi.updateMe>[0]) => {
      const result = await profileApi.updateMe(data)
      if (result) setProfile(result)
      return result
    },
    []
  )

  return { profile, loading, reload: load, updateProfile }
}

export function useAuth() {
  const googleLogin = useCallback(async () => {
    const result = await authApi.googleLogin()
    if (result?.url) {
      window.location.href = result.url
    }
  }, [])

  return { googleLogin }
}