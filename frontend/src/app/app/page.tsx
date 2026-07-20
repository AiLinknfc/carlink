'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api'
import Sidebar from '@/components/Sidebar'
import BgParticles from '@/components/BgParticles'
import ServiceFormModal from '@/components/ServiceFormModal'
import QuickRegisterModal from '@/components/QuickRegisterModal'
import TransferVehicleModal from '@/components/TransferVehicleModal'
import CertificadosTab from '@/components/CertificadosTab'
import DocumentosTab from '@/components/DocumentosTab'
import GaleriaTab from '@/components/GaleriaTab'
import DiagnosticoTab from '@/components/DiagnosticoTab'
import FichaTab from '@/components/tabs/FichaTab'
import HistorialTab from '@/components/tabs/HistorialTab'
import PartesTab from '@/components/tabs/PartesTab'
import TallerTab from '@/components/tabs/TallerTab'

export default function AppPage() {
  const router = useRouter()
  const { user, loading, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('ficha')
  const [vehicle, setVehicle] = useState<any>(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editModelo, setEditModelo] = useState('')
  const [editTipo, setEditTipo] = useState('Sedán')
  const [editAnio, setEditAnio] = useState(2026)
  const [editColor, setEditColor] = useState('')
  const [sellEnabled, setSellEnabled] = useState(false)
  const [sellPrice, setSellPrice] = useState('')
  const [sellCity, setSellCity] = useState('')
  const [sellZip, setSellZip] = useState('')
  const [sellPhone, setSellPhone] = useState('')
  const [sellDescription, setSellDescription] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNfc, setShowNfc] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [nfcTokens, setNfcTokens] = useState<Array<any>>([])
  const [nfcLoading, setNfcLoading] = useState(false)
  const [tokensLoading, setTokensLoading] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [genCopied, setGenCopied] = useState(false)
  const [showQuickRegister, setShowQuickRegister] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [payMethod, setPayMethod] = useState('card')
  const [appToast, setAppToast] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [foundRequests, setFoundRequests] = useState<Array<{id: string; status: string; finder_name?: string; finder_phone?: string; message?: string; created_at: string; vehicle_plate?: string; vehicle_brand?: string; vehicle_model?: string}>>([])
  const [showFoundPanel, setShowFoundPanel] = useState(false)

  useEffect(() => {
    try { setTheme(window.localStorage.getItem('carlink_theme') === 'light' ? 'light' : 'dark') } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    return () => { delete document.documentElement.dataset.theme }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      try { window.localStorage.setItem('carlink_theme', next) } catch { /* ignore */ }
      return next
    })
  }, [])

  const flashApp = useCallback((msg: string) => {
    setAppToast(msg)
    setTimeout(() => setAppToast(null), 2600)
  }, [])

  const toggleNfcActive = useCallback(async () => {
    if (!vehicle?.id) return
    const result = await apiPatch(`/vehicles/${vehicle.id}/nfc-toggle`, {})
    if (result) {
      setVehicle((prev: any) => ({ ...prev, nfc_active: result.nfc_active }))
      flashApp(result.nfc_active ? 'Ficha pública activada' : 'Ficha pública oculta')
    }
  }, [vehicle?.id, flashApp])

  const openTransferModal = useCallback(() => {
    if (!vehicle?.id) return
    setShowTransferModal(true)
  }, [vehicle?.id])

  const onTransferSuccess = useCallback(() => {
    setRefreshKey(k => k + 1)
    flashApp('Solicitud de transferencia enviada')
  }, [flashApp])

  useEffect(() => {
    if (!showNfc || !user) return
    setTokensLoading(true)
    setGeneratedUrl('')
    apiGet('/nfc/tokens').then(data => {
      if (data) setNfcTokens(data)
      setTokensLoading(false)
    })
  }, [showNfc, user])

  useEffect(() => {
    if (!user) return
    apiGet('/found-requests').then(data => {
      if (data) setFoundRequests(data)
    })
  }, [user])

  const markFoundRead = async (id: string) => {
    await apiPatch(`/found-requests/${id}/read`, {})
    setFoundRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'read' } : r))
  }

  const openPublicar = useCallback(() => {
    if (nfcTokens.length > 0) {
      const latest = nfcTokens[0]
      const raw = localStorage.getItem(`nfc_raw_${latest.id}`)
      if (raw) {
        window.open(`/nfc/${raw}`, '_blank')
        return
      }
    }
    flashApp('Genera un llavero NFC primero desde el panel')
  }, [nfcTokens, flashApp])

  const generateNfcToken = async () => {
    if (!user) return
    setNfcLoading(true)
    setGeneratedUrl('')
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const rawToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
    const hashArr = new Uint8Array(hashBuf)
    const tokenHash = Array.from(hashArr).map(b => b.toString(16).padStart(2, '0')).join('')
    const tokenPrefix = rawToken.slice(0, 8)
    const data = await apiPost('/nfc/tokens', { token_hash: tokenHash, token_prefix: tokenPrefix })
    if (data) {
      localStorage.setItem(`nfc_raw_${data.id}`, rawToken)
      setNfcTokens(prev => [data, ...prev])
      setGeneratedUrl(`${window.location.origin}/nfc/${rawToken}`)
    }
    setNfcLoading(false)
  }

  const revokeNfcToken = async (id: string) => {
    const ok = await apiDelete(`/nfc/tokens/${id}`)
    if (ok) {
      localStorage.removeItem(`nfc_raw_${id}`)
      setNfcTokens(prev => prev.filter(t => t.id !== id))
    }
  }

  const onAddService = useCallback(() => {
    setEditRecord(null)
    setShowForm(true)
  }, [])

  const onEditService = useCallback((r: any) => {
    setEditRecord(r)
    setShowForm(true)
  }, [])

  const onCloseForm = useCallback(() => {
    setShowForm(false)
    setEditRecord(null)
  }, [])

  const onSaved = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/'); return }
    setVehicleLoading(true)
    apiGet('/vehicles').then((data) => {
      if (data?.length) setVehicle(data[0])
      setVehicleLoading(false)
    })
  }, [user, loading, router])

  useEffect(() => {
    if (!showProfile) return
    setEditName(vehicle?.owner || profile?.full_name || '')
    setEditModelo(`${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim())
    setEditTipo(vehicle?.type || 'Sedán')
    setEditAnio(vehicle?.year || 2026)
    setEditColor(vehicle?.color || '')
    setSellEnabled(vehicle?.sell_enabled || false)
    setSellPrice(vehicle?.sell_price || '')
    setSellCity(vehicle?.sell_city || '')
    setSellZip(vehicle?.sell_zip || '')
    setSellPhone(vehicle?.sell_phone || '')
    setSellDescription(vehicle?.sell_description || '')
    setWhatsappEnabled(profile?.whatsapp_enabled || false)
    setWhatsappNumber(profile?.whatsapp_number || '')
  }, [showProfile, vehicle, profile])

  if (loading || !user) return null

  const ownerName = vehicle?.owner || profile?.full_name || 'Usuario'
  const initial = profile?.full_name?.charAt(0) || ownerName.charAt(0) || '?'

  const VEHICLE_TYPES = ['Sedán', 'SUV', 'Camioneta', 'Moto', 'Deportivo', 'Hatchback', 'Pickup', 'Furgoneta']
  const YEARS: number[] = []
  for (let y = 2026; y >= 2005; y--) YEARS.push(y)

  const handleSaveProfile = async () => {
    if (!vehicle?.id) return
    const nameParts = editModelo.split(' ')
    const brand = nameParts[0] || ''
    const model = nameParts.slice(1).join(' ') || editModelo
    await Promise.all([
      apiPut('/auth/me', { full_name: editName, whatsapp_enabled: whatsappEnabled, whatsapp_number: whatsappNumber }),
      apiPut(`/vehicles/${vehicle.id}`, {
        brand, model, year: editAnio, type: editTipo, color: editColor,
        sell_enabled: sellEnabled, sell_price: sellPrice, sell_city: sellCity,
        sell_zip: sellZip, sell_phone: sellPhone, sell_description: sellDescription,
      }),
    ])
    setVehicle((prev: any) => prev ? { ...prev, owner: editName, brand, model, year: editAnio, type: editTipo, color: editColor, sell_enabled: sellEnabled, sell_price: sellPrice, sell_city: sellCity, sell_zip: sellZip, sell_phone: sellPhone, sell_description: sellDescription } : prev)
    setShowProfile(false)
  }

  const pageBg = theme === 'light' ? '#f7f6f2' : '#060606'
  const vignetteBg = theme === 'light'
    ? 'radial-gradient(circle at 50% 42%,transparent 40%,rgba(247,246,242,0.94) 100%)'
    : 'radial-gradient(circle at 50% 42%,transparent 40%,rgba(6,6,6,0.86) 100%)'
  const rootTextColor = theme === 'light' ? '#17171a' : '#f5f3ec'
  const glassBg = theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.8)'
  const profileBtnBg = theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.8)'
  const profileBtnBorder = theme === 'light' ? 'rgba(17,17,17,0.1)' : 'rgba(255,255,255,0.12)'
  const profileBtnColor = theme === 'light' ? '#17171a' : '#f5f3ec'
  const tDark = theme !== 'light'

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: pageBg, color: rootTextColor, display: 'flex' }}>
      <BgParticles theme={theme} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: vignetteBg }} />
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        vehicle={vehicle ? {
          modelo: `${vehicle.brand} ${vehicle.model}`.trim() || 'Mi vehículo',
          anio: vehicle.year,
          tipo: vehicle.type,
          color: vehicle.color,
          owner: ownerName,
          wallet_bg_preset_id: vehicle.wallet_bg_preset_id,
          wallet_bg_custom_url: vehicle.wallet_bg_custom_url,
          wallet_logo_url: vehicle.wallet_logo_url,
        } : null}
        plateText={vehicle?.plate}
        city={vehicle?.city}
        vehicleLoading={vehicleLoading}
        onLogout={signOut}
        accountType={profile?.account_type || undefined}
        theme={theme}
      />

      <div className="sidebar-wrap" style={{
        marginLeft: 266, flex: 1, padding: '44px clamp(24px,4vw,56px) 72px',
        position: 'relative', zIndex: 2, minHeight: '100vh', color: rootTextColor,
        background: 'radial-gradient(ellipse at 0 -40%, rgba(245,197,24,0.04) 0%, transparent 55%)',
      }}>
        {/* Top-right action buttons */}
        <div className="topbar-actions" style={{ position: 'absolute', top: 20, right: 'clamp(24px,4vw,56px)', zIndex: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={toggleTheme} title="Cambiar apariencia"
            className="btn-wide"
            style={{ width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(245,197,24,0.35)', background: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.82)', backdropFilter: 'blur(12px)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
            {theme === 'light'
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7"/></svg>
              : <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 14.9A9 9 0 1 1 9.1 3.3a7.2 7.2 0 0 0 11.6 11.6z"/></svg>}
          </button>

          <button onClick={() => setShowQuickRegister(true)} title="Escanear documento"
            style={{ width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(245,197,24,0.35)', background: glassBg, backdropFilter: 'blur(12px)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' }}
            onMouseLeave={e => { e.currentTarget.style.background = glassBg; e.currentTarget.style.color = '#F5C518' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
          </button>

          <button onClick={() => setShowNfc(f => !f)} title="Llavero NFC"
            style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, border: showNfc ? '1px solid #F5C518' : '1px solid rgba(245,197,24,0.35)', background: showNfc ? 'rgba(245,197,24,0.2)' : glassBg, backdropFilter: 'blur(12px)', color: showNfc ? (theme === 'light' ? '#17171a' : '#fff') : '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { if (!showNfc) { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' } }}
            onMouseLeave={e => { if (!showNfc) { e.currentTarget.style.background = glassBg; e.currentTarget.style.color = '#F5C518' } }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><path d="M6 12a6 6 0 0 1 6-6M8.5 12a3.5 3.5 0 0 1 3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
            {nfcTokens.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#F5C518', color: '#111', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid var(--bg, ${tDark ? '#141414' : '#f0efe8'})` }}>{nfcTokens.length}</span>
            )}
          </button>

          {foundRequests.filter(r => r.status === 'pending').length > 0 && (
            <button onClick={() => setShowFoundPanel(true)} title="Llaveros encontrados"
              style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(255,107,107,0.4)', background: glassBg, backdropFilter: 'blur(12px)', color: '#ff6b6b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.background = glassBg }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#ff6b6b', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${tDark ? '#141414' : '#f0efe8'}` }}>{foundRequests.filter(r => r.status === 'pending').length}</span>
            </button>
          )}

          <button onClick={() => setShowCart(true)} title="Solicitar llavero NFC"
            style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(245,197,24,0.4)', background: profileBtnBg, backdropFilter: 'blur(12px)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' }}
            onMouseLeave={e => { e.currentTarget.style.background = profileBtnBg; e.currentTarget.style.color = '#F5C518' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
          </button>

          <button onClick={() => setShowProfile(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px 6px 6px', borderRadius: 999, border: `1px solid ${profileBtnBorder}`, background: profileBtnBg, backdropFilter: 'blur(12px)', color: profileBtnColor, cursor: 'pointer', transition: 'all .16s' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{initial}</span>
            <span className="action-btn-text" style={{ fontSize: 13, fontWeight: 600 }}>{ownerName}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 10 }}>
          {activeTab === 'ficha' ? <FichaTab vehicle={vehicle} onAddService={onAddService} onEditService={onEditService} onOpenPublicar={openPublicar} nfcTokens={nfcTokens} toggleNfcActive={toggleNfcActive} refreshKey={refreshKey} theme={theme} /> :
           activeTab === 'historial' ? <HistorialTab vehicleId={vehicle?.id} onAddService={onAddService} onEditService={onEditService} refreshKey={refreshKey} /> :
           activeTab === 'diagnostico' ? <DiagnosticoTab vehicleId={vehicle?.id} /> :
           activeTab === 'partes' ? <PartesTab vehicleId={vehicle?.id} /> :
           activeTab === 'galeria' ? <GaleriaTab vehicleId={vehicle?.id} /> :
           activeTab === 'certificados' ? <CertificadosTab vehicleId={vehicle?.id} refreshKey={refreshKey} /> :
           activeTab === 'documentos' ? <DocumentosTab vehicleId={vehicle?.id} refreshKey={refreshKey} /> :
           activeTab === 'taller' ? <TallerTab vehicleId={vehicle?.id} /> :
           <FichaTab vehicle={vehicle} onAddService={onAddService} onEditService={onEditService} onOpenPublicar={openPublicar} nfcTokens={nfcTokens} toggleNfcActive={toggleNfcActive} refreshKey={refreshKey} theme={theme} />}
        </div>

        {/* App-level toast */}
        {appToast && (
          <div style={{ position: 'fixed', left: '50%', bottom: 34, zIndex: 60, transform: 'translateX(-50%)', animation: 'toastIn .4s both', display: 'flex', gap: 11, alignItems: 'center', padding: '14px 24px', borderRadius: 999, background: 'rgba(16,16,16,0.94)', backdropFilter: 'blur(14px)', border: '1px solid rgba(245,197,24,0.5)', color: '#fff8e6', fontWeight: 600, fontSize: 14 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </span>
            {appToast}
          </div>
        )}
      </div>

      {/* Service form modal */}
      {showForm && vehicle?.id && (
        <ServiceFormModal
          vehicleId={vehicle.id}
          editRecord={editRecord}
          onClose={onCloseForm}
          onSaved={onSaved}
        />
      )}

      {/* Transfer vehicle modal */}
      {showTransferModal && vehicle && (
        <TransferVehicleModal
          vehicle={vehicle}
          onClose={() => setShowTransferModal(false)}
          onSuccess={onTransferSuccess}
        />
      )}

      {/* Profile right panel */}
      {showProfile && (
        <div onClick={() => setShowProfile(false)} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 72, background: 'transparent', display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} className="profile-panel" style={{ width: 420, maxWidth: 'calc(100vw - 32px)', height: 'calc(100vh - 32px)', margin: 16, overflowY: 'auto', background: 'var(--panel-bg)', borderRadius: 20, boxShadow: tDark ? '0 20px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(245,197,24,0.12)' : '0 20px 60px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, padding: '20px 24px 0', borderBottom: '1px solid var(--panel-border)', paddingBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{initial}</span>
                <div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, textTransform: 'uppercase', lineHeight: 1 }}>Mi perfil</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{profile?.email}</div>
                </div>
              </div>
              <button onClick={() => setShowProfile(false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, padding: '0 24px 24px', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 10 }}>Datos del usuario</div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre completo</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>Datos del vehículo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Modelo / línea</label>
                  <input value={editModelo} onChange={e => setEditModelo(e.target.value)} placeholder="Ej. Mazda 3 Grand Touring" style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipo</label>
                  <select value={editTipo} onChange={e => setEditTipo(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                    {VEHICLE_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Año</label>
                  <select value={editAnio} onChange={e => setEditAnio(Number(e.target.value))} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Color</label>
                  <input value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none' }} />
                </div>
              </div>
              {/* Sell toggle */}
              <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: sellEnabled ? 'rgba(245,197,24,0.08)' : 'var(--surface-2)', border: `1px solid ${sellEnabled ? 'rgba(245,197,24,0.3)' : 'var(--border)'}`, transition: 'all .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)' }}>Publicar mi perfil</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Ofrecer este vehículo en venta</div>
                  </div>
                  <button onClick={() => setSellEnabled(v => !v)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', background: sellEnabled ? '#F5C518' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flex: '0 0 auto' }}>
                    <span style={{ position: 'absolute', top: 3, left: sellEnabled ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: sellEnabled ? '#111' : '#666', transition: 'left .2s' }} />
                  </button>
                </div>

                {sellEnabled && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp .3s both' }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Precio de venta</label>
                      <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="Ej. 45.000.000"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Ciudad</label>
                        <input value={sellCity} onChange={e => setSellCity(e.target.value)} placeholder="Ej. Bogotá"
                          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Código postal</label>
                        <input value={sellZip} onChange={e => setSellZip(e.target.value)} placeholder="Ej. 110110"
                          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Teléfono de contacto</label>
                      <input value={sellPhone} onChange={e => setSellPhone(e.target.value)} placeholder="Ej. +57 300 123 4567"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Descripción de la venta</label>
                      <textarea value={sellDescription} onChange={e => setSellDescription(e.target.value)} rows={3} placeholder="Ej. Vehículo en excelente estado, único dueño, documentación al día…"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowTransferModal(true)}
                style={{
                  marginTop: 18, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 0', borderRadius: 12,
                  border: '1px solid rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.1)', color: '#F5C518',
                  fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  transition: 'all .18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.2)'; e.currentTarget.style.borderColor = '#F5C518' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                Transferir vehículo
              </button>

              <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: whatsappEnabled ? 'rgba(74,222,128,0.08)' : 'var(--surface-2)', border: `1px solid ${whatsappEnabled ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`, transition: 'all .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#4ade80' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Contacto WhatsApp
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Permite que quien encuentre tu llavero te contacte por WhatsApp</div>
                  </div>
                  <button onClick={() => setWhatsappEnabled(v => !v)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', background: whatsappEnabled ? '#4ade80' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flex: '0 0 auto' }}>
                    <span style={{ position: 'absolute', top: 3, left: whatsappEnabled ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: whatsappEnabled ? '#111' : '#666', transition: 'left .2s' }} />
                  </button>
                </div>
                {whatsappEnabled && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Número de WhatsApp</label>
                    <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="Ej. +57 300 123 4567"
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: tDark ? '#f5f3ec' : '#17171a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>

              <button onClick={handleSaveProfile} style={{ marginTop: 18, width: '100%', padding: 13, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar cambios</button>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button onClick={() => setShowProfile(false)} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => { setShowProfile(false); signOut() }} style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,55,55,0.3)', background: 'rgba(255,55,55,0.08)', color: '#ff4d6a', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NFC llavero panel */}
      {showNfc && (
        <div onClick={() => { setShowNfc(false); setGeneratedUrl(''); setGenCopied(false) }} style={{ position: 'fixed', inset: 0, zIndex: 72, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="nfc-panel" style={{ width: 520, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 22, padding: 24, boxShadow: tDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: 12, background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.2v5.6M12 15.2v5.6M3.2 12h5.6M15.2 12h5.6"/></svg>
                </span>
                <div>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, textTransform: 'uppercase', lineHeight: 1.1 }}>Llavero NFC</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Ficha pública de tu vehículo</div>
                </div>
              </div>
              <button onClick={() => { setShowNfc(false); setGeneratedUrl(''); setGenCopied(false) }} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#d8c98a', lineHeight: 1.5 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ flex: '0 0 auto', marginTop: 1 }}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                <span>Al tocar tu llavero NFC contra el teléfono, se abre la ficha técnica al instante. El taller la actualiza en segundos.</span>
              </div>
            </div>

            <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--section-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: tDark ? '#fff' : '#17171a', marginBottom: 2 }}>Ficha pública</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                  {vehicle?.nfc_active !== false ? 'Visible al escanear el llavero NFC.' : 'Oculta — el llavero no mostrará la ficha.'}
                </div>
              </div>
              <button onClick={toggleNfcActive} role="switch" aria-checked={vehicle?.nfc_active !== false}
                title={vehicle?.nfc_active !== false ? 'Desactivar ficha pública' : 'Activar ficha pública'}
                style={{ position: 'relative', width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', flex: '0 0 auto', background: vehicle?.nfc_active !== false ? '#2ecc71' : 'rgba(255,255,255,0.15)', transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: 2, left: vehicle?.nfc_active !== false ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
              </button>
            </div>

            <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--section-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 }}>Tus llaveros activos</div>
                <button onClick={generateNfcToken} disabled={nfcLoading}
                  style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(245,197,24,0.35)', background: nfcLoading ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.15)', color: nfcLoading ? '#998a4a' : '#F5C518', fontSize: 12, fontWeight: 700, cursor: nfcLoading ? 'default' : 'pointer', transition: 'all .16s' }}>
                  {nfcLoading ? 'Generando…' : '+ Nuevo llavero'}
                </button>
              </div>

              {tokensLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>Cargando…</div>
              ) : nfcTokens.length === 0 && !generatedUrl ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0', lineHeight: 1.5 }}>
                  Aún no has generado ningún llavero. Presiona <b style={{ color: 'var(--text-2)' }}>+ Nuevo llavero</b> para crear uno.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nfcTokens.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: t.is_active ? 'rgba(46,204,113,0.05)' : 'rgba(255,55,55,0.05)', border: t.is_active ? '1px solid rgba(46,204,113,0.2)' : '1px solid rgba(255,55,55,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 13, color: t.is_active ? '#2ecc71' : '#ff4d6a', fontWeight: 700 }}>{t.token_prefix}…</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {t.is_active ? `${t.access_count} accesos` : 'Revocado'}
                          {t.last_accessed_at && ` · última vez ${new Date(t.last_accessed_at).toLocaleDateString()}`}
                        </span>
                      </div>
                      {t.is_active && (
                        <button onClick={() => revokeNfcToken(t.id)} title="Revocar"
                          style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(255,55,55,0.3)', background: 'rgba(255,55,55,0.08)', color: '#ff4d6a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          Revocar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {generatedUrl && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(245,197,24,0.1)', border: '2px solid #F5C518' }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 6 }}>¡Nuevo llavero generado!</div>
                  <div style={{ fontSize: 12, color: '#b6b2a6', marginBottom: 8, lineHeight: 1.4 }}>
                    Este enlace es la <b>única vez que se muestra</b>. Copialo ahora para programar tu chip NFC:
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <input readOnly value={generatedUrl} onClick={e => (e.target as HTMLInputElement).select()}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(245,197,24,0.4)', background: 'var(--inset-dark)', color: '#F5C518', fontSize: 11, fontFamily: "'Anton',sans-serif", outline: 'none', cursor: 'text' }} />
                    <button onClick={() => { navigator.clipboard.writeText(generatedUrl).then(() => { setGenCopied(true); setTimeout(() => setGenCopied(false), 2000) }).catch(() => {}) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: genCopied ? '#2ecc71' : '#F5C518', color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                      {genCopied && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}{genCopied ? 'Copiado' : 'Copiar enlace'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1, color: '#F5C518', fontSize: 10, fontWeight: 800 }}>1</span>
                <span>Genera el enlace único en esta pantalla y copialo.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1, color: '#F5C518', fontSize: 10, fontWeight: 800 }}>2</span>
                <span>El taller escribe el enlace en tu llavero NFC con un programador compatible.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1, color: '#F5C518', fontSize: 10, fontWeight: 800 }}>3</span>
                <span>Al acercar el llavero al teléfono, se abre tu ficha técnica al instante. Sin apps, sin búsquedas.</span>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              <div style={{ fontSize: 12, color: '#5be89a', lineHeight: 1.4 }}>
                <b style={{ fontWeight: 700 }}>Seguro por diseño.</b> El token de 256 bits se hashea con SHA-256 antes de almacenarse. El backend nunca ve la clave original. El endpoint público solo expone placa, modelo y color — nunca datos del dueño.
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickRegister && vehicle?.id && (
        <QuickRegisterModal
          vehicleId={vehicle.id}
          onClose={() => setShowQuickRegister(false)}
          onSuccess={flashApp}
          onSaved={onSaved}
        />
      )}

      {/* Cart — Solicitar llavero NFC */}
      {showCart && (
        <div onClick={() => setShowCart(false)} style={{ position: 'fixed', inset: 0, zIndex: 74, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 22, padding: 24, boxShadow: tDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, textTransform: 'uppercase' }}>Solicitar llavero NFC</div>
              <button onClick={() => setShowCart(false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 16, background: tDark ? 'linear-gradient(135deg,rgba(245,197,24,0.14),rgba(20,20,20,0.6))' : 'linear-gradient(135deg,rgba(245,197,24,0.12),rgba(247,246,242,0.9))', border: '1px solid rgba(245,197,24,0.28)', margin: '10px 0 16px' }}>
              <span style={{ width: 60, height: 60, flex: '0 0 auto', borderRadius: 14, background: 'radial-gradient(circle at 40% 35%,#3a3a3a,#141414)', border: '2px solid #F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518', boxShadow: '0 0 22px rgba(245,197,24,0.35)' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><path d="M6 12a6 6 0 0 1 6-6M8.5 12a3.5 3.5 0 0 1 3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: tDark ? '#fff' : '#17171a' }}>Llavero NFC CarLink</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Aro metálico + chip programado con tu ficha. Envío a domicilio 3–5 días.</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Llavero NFC (1 und.)</span><span style={{ color: tDark ? '#f5f3ec' : '#17171a', fontWeight: 600 }}>$59.900</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Programación + envío</span><span style={{ color: '#5be89a', fontWeight: 600 }}>Gratis</span></div>
              <div style={{ height: 1, background: 'var(--section-border)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span style={{ color: tDark ? '#fff' : '#17171a', fontWeight: 700 }}>Total</span><span style={{ color: '#F5C518', fontWeight: 800, fontFamily: "'Anton',sans-serif", fontSize: 20 }}>$59.900</span></div>
            </div>

            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 9 }}>Método de pago</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[{ id: 'card', name: 'Tarjeta de crédito / débito' }, { id: 'pse', name: 'PSE — débito bancario' }, { id: 'nequi', name: 'Nequi' }].map(pm => {
                const active = payMethod === pm.id
                return (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600, background: active ? 'rgba(245,197,24,0.14)' : 'var(--input-bg)', border: `1.5px solid ${active ? '#F5C518' : 'var(--input-border)'}`, color: active ? (tDark ? '#fff' : '#17171a') : 'var(--text-3)' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? '#F5C518' : '#6f6a5f'}`, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#F5C518' : 'transparent' }} /></span>
                    {pm.name}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--section-border)', marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" style={{ marginTop: 1, flex: '0 0 auto' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Enviar a <b style={{ color: tDark ? '#f5f3ec' : '#17171a' }}>{ownerName}</b> · Placa {vehicle?.plate || '—'} · {vehicle?.city || '—'}</div>
            </div>

            <button onClick={() => { setShowCart(false); flashApp('Pago aprobado — preparando tu envío') }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: 13, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>Pagar $59.900
            </button>
          </div>
        </div>
      )}

      {/* Found Requests Panel */}
      {showFoundPanel && (
        <div onClick={() => setShowFoundPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '94vw', maxHeight: '85vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 22, padding: 24, boxShadow: tDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, textTransform: 'uppercase', color: '#ff6b6b' }}>Llaveros encontrados</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Personas que encontraron tu llavero NFC</div>
              </div>
              <button onClick={() => setShowFoundPanel(false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {foundRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5c5c6a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Sin reportes aún</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Cuando alguien encuentre tu llavero, recibirás una notificación aquí.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {foundRequests.map((req) => (
                  <div key={req.id} onClick={() => { if (req.status === 'pending') markFoundRead(req.id) }} style={{ padding: '14px 16px', borderRadius: 14, background: req.status === 'pending' ? 'rgba(255,107,107,0.08)' : 'var(--surface-2)', border: `1px solid ${req.status === 'pending' ? 'rgba(255,107,107,0.25)' : 'var(--border)'}`, cursor: req.status === 'pending' ? 'pointer' : 'default', transition: 'all .2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,107,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', flex: '0 0 auto' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: tDark ? '#fff' : '#17171a' }}>{req.finder_name || 'Anónimo'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(req.created_at).toLocaleDateString()} · {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      {req.status === 'pending' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b6b', flex: '0 0 auto', marginTop: 6 }} />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>{req.message}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {req.finder_phone && (
                        <a href={`tel:${req.finder_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.25)', color: '#F5C518', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          {req.finder_phone}
                        </a>
                      )}
                      {req.finder_phone && (
                        <a href={`https://wa.me/${req.finder_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      )}
                      {req.vehicle_plate && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 11, fontWeight: 600 }}>
                          {req.vehicle_brand} {req.vehicle_model} · {req.vehicle_plate}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
