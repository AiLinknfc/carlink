import { supabase } from './supabase'

export async function uploadFile(file: File, folder: string = 'general'): Promise<string | null> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) {
      let msg = 'Error al subir'
      try { const j = await res.json(); msg = j.detail || msg } catch { try { msg = await res.text() || msg } catch {} }
      console.warn('upload failed:', res.status, msg)
      return null
    }
    const data = await res.json()
    return data.url as string
  } catch (e) {
    console.warn('upload error:', e)
    return null
  }
}

export interface OcrExtractResult {
  title: string | null
  vendor: string | null
  issue_date: string | null
  cost: number | null
  currency: string | null
  raw_text: string
}

export async function scanDocument(file: File): Promise<OcrExtractResult | null> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/ocr/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) {
      console.warn('OCR scan failed:', await res.text())
      return null
    }
    return res.json()
  } catch (e) {
    console.warn('OCR scan error:', e)
    return null
  }
}

export async function downloadFile(path: string, filename: string): Promise<boolean> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return false

    const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return false

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch (e) {
    console.warn('download error:', e)
    return false
  }
}

export async function uploadImageViaFileReader(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => resolve(null)
    r.readAsDataURL(file)
  })
}

export function fileExtension(url: string): string {
  const clean = url.split('?')[0]
  const match = clean.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1] : 'bin'
}

export function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf')
}

export function isImage(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/i.test(url)
}

export async function deleteUploadedFile(key: string): Promise<boolean> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return false
    const res = await fetch(`/api/upload/${key}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}

export interface VehicleCardScan {
  plate: string | null
  city: string | null
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  owner_name: string | null
  document_number: string | null
  raw_text: string
}

/* Lee una tarjeta de propiedad para prellenar el registro. Es ayuda de captura:
   el usuario confirma los campos y la verificación real la hace una persona. */
export async function scanVehicleCard(file: File): Promise<VehicleCardScan | null> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/ocr/vehicle-card', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) {
      console.warn('Vehicle card scan failed:', await res.text())
      return null
    }
    return res.json()
  } catch (e) {
    console.warn('Vehicle card scan error:', e)
    return null
  }
}
