import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api'
import type { Vehicle, MaintenanceRecord, Part, Certificate, Document, GalleryImage, Diagnostic, Workshop, NfcToken, DocumentEnhanced } from './types'

export function useVehicle(vehicleId: string | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/vehicles/${vehicleId}`).then(d => {
      if (d) setVehicle(d as Vehicle)
    }).finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  return { vehicle, loading, reload: load }
}

export function useMaintenance(vehicleId: string | undefined) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [latest, setLatest] = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      apiGet(`/maintenance/vehicle/${vehicleId}`).then(d => { if (d) setRecords(d as MaintenanceRecord[]) }),
      apiGet(`/maintenance/vehicle/${vehicleId}/latest`).then(d => { if (d) setLatest(d as MaintenanceRecord) }),
    ]).finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  const addRecord = useCallback(async (data: Partial<MaintenanceRecord> & { vehicle_id: string; service_type: string; mileage: number }) => {
    const result = await apiPost('/maintenance', data)
    if (result) load()
    return result
  }, [load])

  const updateRecord = useCallback(async (id: string, data: Partial<MaintenanceRecord>) => {
    const result = await apiPut(`/maintenance/${id}`, data)
    if (result) load()
    return result
  }, [load])

  const deleteRecord = useCallback(async (id: string) => {
    const ok = await apiDelete(`/maintenance/${id}`)
    if (ok) load()
    return ok
  }, [load])

  return { records, latest, loading, reload: load, addRecord, updateRecord, deleteRecord }
}

export function useParts(vehicleId: string | undefined) {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/parts/vehicle/${vehicleId}`).then(d => {
      if (d) setParts(d as Part[])
    }).finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  const addPart = useCallback(async (data: Partial<Part> & { vehicle_id: string; name: string }) => {
    const result = await apiPost('/parts', data)
    if (result) load()
    return result
  }, [load])

  const updatePart = useCallback(async (id: string, data: Partial<Part>) => {
    const result = await apiPut(`/parts/${id}`, data)
    if (result) load()
    return result
  }, [load])

  const deletePart = useCallback(async (id: string) => {
    const ok = await apiDelete(`/parts/${id}`)
    if (ok) load()
    return ok
  }, [load])

  return { parts, loading, reload: load, addPart, updatePart, deletePart }
}

export function useGallery(vehicleId: string | undefined) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/gallery/vehicle/${vehicleId}`).then(d => {
      if (d) setImages(d as GalleryImage[])
    }).finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  const addImage = useCallback(async (data: { vehicle_id: string; image_url: string; caption?: string }) => {
    const result = await apiPost('/gallery', data)
    if (result) load()
    return result
  }, [load])

  const deleteImage = useCallback(async (id: string) => {
    const ok = await apiDelete(`/gallery/${id}`)
    if (ok) load()
    return ok
  }, [load])

  const updateImage = useCallback(async (id: string, data: Partial<GalleryImage>) => {
    const result = await apiPatch(`/gallery/${id}`, data)
    if (result) load()
    return result
  }, [load])

  return { images, loading, reload: load, addImage, updateImage, deleteImage }
}

export function useCertificates(vehicleId: string | undefined) {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/certificates/vehicle/${vehicleId}`).then(d => {
      if (d) setCertificates(d as Certificate[])
    }).finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  const addCertificate = useCallback(async (data: { vehicle_id: string; name: string; issued_by?: string; file_url?: string; issue_date?: string; expiry_date?: string; notes?: string }) => {
    const result = await apiPost('/certificates', data)
    if (result) load()
    return result
  }, [load])

  const updateCertificate = useCallback(async (id: string, data: Partial<Certificate>) => {
    const result = await apiPut(`/certificates/${id}`, data)
    if (result) load()
    return result
  }, [load])

  const deleteCertificate = useCallback(async (id: string) => {
    const ok = await apiDelete(`/certificates/${id}`)
    if (ok) load()
    return ok
  }, [load])

  return { certificates, loading, reload: load, addCertificate, updateCertificate, deleteCertificate }
}

export function useDocuments(vehicleId: string | undefined) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/documents/vehicle/${vehicleId}`).then(d => {
      if (d) setDocuments(d as Document[])
    }).finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  const addDocument = useCallback(async (data: { vehicle_id: string; name: string; type?: string; file_url?: string; notes?: string }) => {
    const result = await apiPost('/documents', data)
    if (result) load()
    return result
  }, [load])

  const updateDocument = useCallback(async (id: string, data: Partial<Document>) => {
    const result = await apiPut(`/documents/${id}`, data)
    if (result) load()
    return result
  }, [load])

  const deleteDocument = useCallback(async (id: string) => {
    const ok = await apiDelete(`/documents/${id}`)
    if (ok) load()
    return ok
  }, [load])

  return { documents, loading, reload: load, addDocument, updateDocument, deleteDocument }
}

export function useDiagnostics(vehicleId: string | undefined) {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/diagnostics/vehicle/${vehicleId}`).then(d => {
      if (d) setDiagnostics(d as Diagnostic[])
    }).finally(() => setLoading(false))
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  const addDiagnostic = useCallback(async (data: { vehicle_id: string; alert_type: string; description: string; severity?: string }) => {
    const result = await apiPost('/diagnostics', data)
    if (result) load()
    return result
  }, [load])

  const resolveDiagnostic = useCallback(async (id: string) => {
    const result = await apiPut(`/diagnostics/${id}/resolve`, {})
    if (result) load()
    return result
  }, [load])

  return { diagnostics, loading, reload: load, addDiagnostic, resolveDiagnostic }
}

export function useNfcTokens() {
  const [tokens, setTokens] = useState<NfcToken[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    apiGet('/nfc/tokens').then(d => {
      if (d) setTokens(d as NfcToken[])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { tokens, loading, reload: load }
}

export function useCountdown(deadline: number | null) {
  const targetRef = useRef(deadline)
  if (deadline !== null) targetRef.current = deadline

  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const ms = targetRef.current
    if (ms == null) return
    const deadline = ms
    function tick() {
      const diff = Math.max(0, deadline - Date.now())
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
  }, [])
  return cd
}

export function useWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    apiGet('/workshops/search?q=').then(d => {
      if (d) setWorkshops(d as Workshop[])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  return { workshops, loading, reload: load }
}
