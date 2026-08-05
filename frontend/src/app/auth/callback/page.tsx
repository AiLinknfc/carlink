'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, apiUrl } from '@/lib/supabase'
import { isBusinessAccount } from '@/lib/constants'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      const token = session.access_token

      // Taller/empresa aterriza directo en su panel de negocio, no en la
      // ficha de un vehículo — account_type solo pasa a 'taller' después de
      // que POST /workshops crea el Workshop (workshops.py), así que llegar
      // aquí con una cuenta de negocio ya garantiza que existe.
      try {
        const profileRes = await fetch(apiUrl('/auth/me'), { headers: { Authorization: `Bearer ${token}` } })
        if (profileRes.ok) {
          const profile = await profileRes.json()
          if (isBusinessAccount(profile?.account_type)) {
            router.push('/app/negocio')
            return
          }
        } else {
          console.warn('[callback] /auth/me returned', profileRes.status)
        }
      } catch (e) {
        console.warn('[callback] profile fetch failed:', e)
      }

      try {
        const res = await fetch(apiUrl('/vehicles'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const vehicles = await res.json()
          if (vehicles?.length > 0) {
            router.push('/app')
            return
          }
        } else {
          console.warn('[callback] /vehicles returned', res.status)
        }
      } catch (e) {
        console.warn('[callback] fetch failed:', e)
      }
      router.push('/register')
    })
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060606' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#b6b2a6', fontSize: 14 }}>Autenticando...</div>
      </div>
    </div>
  )
}
