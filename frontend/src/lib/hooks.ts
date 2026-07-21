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