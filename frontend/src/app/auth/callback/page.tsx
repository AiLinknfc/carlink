'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, apiUrl } from '@/lib/supabase'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[callback] session:', session ? session.user.id : 'null')
      if (!session) { router.push('/'); return }
      try {
        const token = session.access_token
        console.log('[callback] checking vehicles...')
        const res = await fetch(apiUrl('/vehicles'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const vehicles = await res.json()
          console.log('[callback] vehicles:', vehicles?.length)
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
