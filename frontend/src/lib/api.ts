import { supabase, apiUrl } from './supabase'

export async function apiGet(path: string) {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null
    const res = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    console.warn(`apiGet(${path}) failed:`, e)
    return null
  }
}

export async function apiPost(path: string, body: any) {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null
    const res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    console.warn(`apiPost(${path}) failed:`, e)
    return null
  }
}

export async function apiPatch(path: string, body: any) {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null
    const res = await fetch(apiUrl(path), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    console.warn(`apiPatch(${path}) failed:`, e)
    return null
  }
}

export async function apiPut(path: string, body: any) {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return null
    const res = await fetch(apiUrl(path), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    console.warn(`apiPut(${path}) failed:`, e)
    return null
  }
}

export async function apiDelete(path: string) {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return false
    const res = await fetch(apiUrl(path), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch (e) {
    console.warn(`apiDelete(${path}) failed:`, e)
    return false
  }
}
