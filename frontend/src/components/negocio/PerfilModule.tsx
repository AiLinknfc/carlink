'use client'

import { useEffect, useState } from 'react'
import { useMyWorkshop, useWorkshopMechanics, useWorkshopServices, useWorkshopReviews } from '@/lib/hooks'
import type { Workshop } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, money, SERVICE_CATEGORIES } from './shared'

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'mecanicos', label: 'Mecánicos' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'resenas', label: 'Reseñas' },
] as const

/* Sub-tabs (General/Mecánicos/Servicios/Reseñas) — igual que tallerpro
   (WorkshopProfileModal: activeTab 'general'|'mechanics'|'services', ver
   docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase C.7). Antes todo esto vivía en una
   sola página larga sin segmentar. */
export default function PerfilModule({ theme, workshop }: { theme: 'light' | 'dark'; workshop: Workshop }) {
  const t = negocioTokens(theme)
  const { updateWorkshop } = useMyWorkshop()
  const [section, setSection] = useState<typeof SECTIONS[number]['id']>('general')
  const { mechanics, addMechanic, updateMechanic, deleteMechanic } = useWorkshopMechanics()
  const { services, addService, deleteService } = useWorkshopServices()
  const { reviews, addReview, respondReview } = useWorkshopReviews()

  const [form, setForm] = useState({
    name: workshop.name,
    slogan: workshop.slogan, workshop_type: workshop.workshop_type, email: workshop.email,
    business_hours: workshop.business_hours, manager_name: workshop.manager_name,
    manager_role: workshop.manager_role, tax_rate_percent: String(Number(workshop.tax_rate_percent)),
    specialties: workshop.specialties.join(', '),
    social_instagram: workshop.social_instagram, social_facebook: workshop.social_facebook,
    social_website: workshop.social_website, social_whatsapp: workshop.social_whatsapp,
  })
  // Sellos de fidelidad: campo separado porque stamps_required es numérico
  // (slider) y ya vivía en WorkshopConfigTab.tsx (/app → tab Promoción) antes
  // de que existiera este panel — se dejó esa tab funcionando tal cual (no se
  // tocó) y este panel se volvió la fuente completa, ver
  // docs/PLAN_MIGRACION_TALLERPRO.md Fase 5.
  const [stampsRequired, setStampsRequired] = useState(workshop.stamps_required)
  const [promoDesc, setPromoDesc] = useState(workshop.promotion_description)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Toggle "Publicar mi ficha pública" — aplica al instante (no espera al
  // botón "Guardar cambios" del resto del formulario), default true
  // (migración 033) para no des-publicar ninguna ficha existente.
  const [published, setPublished] = useState(workshop.is_published)
  const [togglingPublish, setTogglingPublish] = useState(false)

  useEffect(() => {
    setForm({
      name: workshop.name,
      slogan: workshop.slogan, workshop_type: workshop.workshop_type, email: workshop.email,
      business_hours: workshop.business_hours, manager_name: workshop.manager_name,
      manager_role: workshop.manager_role, tax_rate_percent: String(Number(workshop.tax_rate_percent)),
      specialties: workshop.specialties.join(', '),
      social_instagram: workshop.social_instagram, social_facebook: workshop.social_facebook,
      social_website: workshop.social_website, social_whatsapp: workshop.social_whatsapp,
    })
    setStampsRequired(workshop.stamps_required)
    setPromoDesc(workshop.promotion_description)
    setPublished(workshop.is_published)
  }, [workshop])

  const togglePublish = async () => {
    setTogglingPublish(true)
    const next = !published
    const result = await updateWorkshop({ is_published: next })
    setTogglingPublish(false)
    if (result) setPublished(result.is_published)
  }

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value })),
  })

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const result = await updateWorkshop({
      name: form.name.trim(),
      slogan: form.slogan, workshop_type: form.workshop_type, email: form.email,
      business_hours: form.business_hours, manager_name: form.manager_name, manager_role: form.manager_role,
      tax_rate_percent: Number(form.tax_rate_percent) || 0,
      specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
      social_instagram: form.social_instagram, social_facebook: form.social_facebook,
      social_website: form.social_website, social_whatsapp: form.social_whatsapp,
      stamps_required: stampsRequired, promotion_description: promoDesc,
    })
    setSaving(false)
    if (result) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  const [mechanicModal, setMechanicModal] = useState(false)
  const [mechanicName, setMechanicName] = useState('')
  const [mechanicRole, setMechanicRole] = useState('')

  const [serviceModal, setServiceModal] = useState(false)
  const [serviceName, setServiceName] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceHours, setServiceHours] = useState('')

  const [reviewModal, setReviewModal] = useState(false)
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  return (
    <div style={{ animation: 'sectionIn .4s both', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${t.subtleBorder}` }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '10px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent',
            color: section === s.id ? t.gold : t.textMuted,
            borderBottom: `2px solid ${section === s.id ? t.gold : 'transparent'}`, marginBottom: -1,
          }}>{s.label}</button>
        ))}
      </div>

      {section === 'general' && (
      <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${published ? t.border : 'rgba(255,77,106,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
            Ficha pública
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: published ? 'rgba(46,204,113,0.14)' : 'rgba(255,77,106,0.12)', color: published ? t.success : t.danger }}>
              {published ? 'PUBLICADA' : 'OCULTA'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: t.textMuted, margin: '4px 0 0', maxWidth: 440, lineHeight: 1.5 }}>
            {published
              ? <>Visible en <code style={{ color: t.textPrimary }}>/taller/{workshop.code}</code> y su código QR — cualquiera con el enlace o el QR puede verla.</>
              : 'Oculta: tu QR y tu enlace público muestran "no disponible" hasta que la vuelvas a publicar.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {published && (
            <a href={`/taller/${workshop.code}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: t.gold, textDecoration: 'none' }}>Ver ficha ↗</a>
          )}
          <button onClick={togglePublish} disabled={togglingPublish} aria-label="Publicar ficha pública" role="switch" aria-checked={published} style={{
            width: 46, height: 26, borderRadius: 999, border: 'none', cursor: togglingPublish ? 'default' : 'pointer',
            background: published ? t.gold : t.subtleBorder, position: 'relative', flex: '0 0 auto', opacity: togglingPublish ? 0.6 : 1, transition: 'background .18s',
          }}>
            <span style={{
              position: 'absolute', top: 3, left: published ? 23 : 3, width: 20, height: 20, borderRadius: '50%',
              background: published ? '#111' : t.textMuted, transition: 'left .18s',
            }} />
          </button>
        </div>
      </div>
      )}

      {section === 'general' && (
      <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 14 }}>Datos del taller</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle(t)}>Nombre del taller</label>
            <input style={inputStyle(t)} {...field('name')} placeholder="Ej. Taller Central CarLink" />
            <p style={{ fontSize: 11, color: t.textMuted, margin: '5px 0 0' }}>
              Es el nombre que ven tus clientes: en el sidebar, la ficha pública y su QR.
            </p>
          </div>
          <div><label style={labelStyle(t)}>Eslogan</label><input style={inputStyle(t)} {...field('slogan')} placeholder="Ej. Calidad garantizada en cada servicio" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Tipo de taller</label><input style={inputStyle(t)} {...field('workshop_type')} placeholder="Taller multimarca, CDA…" /></div>
            <div><label style={labelStyle(t)}>Email</label><input style={inputStyle(t)} {...field('email')} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Horario</label><input style={inputStyle(t)} {...field('business_hours')} placeholder="Lun-Sáb 8am-6pm" /></div>
            <div><label style={labelStyle(t)}>IVA (%)</label><input type="number" style={inputStyle(t)} {...field('tax_rate_percent')} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Encargado</label><input style={inputStyle(t)} {...field('manager_name')} /></div>
            <div><label style={labelStyle(t)}>Cargo</label><input style={inputStyle(t)} {...field('manager_role')} /></div>
          </div>
          <div><label style={labelStyle(t)}>Especialidades (separadas por coma)</label><input style={inputStyle(t)} {...field('specialties')} placeholder="Frenos, Suspensión, Diagnóstico electrónico" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Instagram</label><input style={inputStyle(t)} {...field('social_instagram')} /></div>
            <div><label style={labelStyle(t)}>Facebook</label><input style={inputStyle(t)} {...field('social_facebook')} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Sitio web</label><input style={inputStyle(t)} {...field('social_website')} /></div>
            <div><label style={labelStyle(t)}>WhatsApp</label><input style={inputStyle(t)} {...field('social_whatsapp')} /></div>
          </div>
          <div style={{ paddingTop: 6, borderTop: `1px solid ${t.subtleBorder}` }}>
            <label style={labelStyle(t)}>Sellos requeridos para el beneficio de fidelidad</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="range" min={1} max={20} value={stampsRequired} onChange={e => setStampsRequired(Number(e.target.value))} style={{ flex: 1, accentColor: t.gold }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: t.gold, minWidth: 32, textAlign: 'center' }}>{stampsRequired}</span>
            </div>
          </div>
          <div><label style={labelStyle(t)}>Descripción de la promoción</label><textarea rows={2} style={{ ...inputStyle(t), resize: 'vertical' }} value={promoDesc} onChange={e => setPromoDesc(e.target.value)} placeholder="Ej. Cambio de aceite gratis al completar todos los sellos" /></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button onClick={save} disabled={saving || !form.name.trim()} style={primaryBtnStyle(t, saving || !form.name.trim())}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            {saved && <span style={{ fontSize: 12.5, color: t.success, fontWeight: 700 }}>¡Guardado!</span>}
          </div>
        </div>
      </div>
      )}

      {section === 'mecanicos' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700 }}>Mecánicos</div>
          <button onClick={() => setMechanicModal(true)} style={{ ...ghostBtnStyle(t), padding: '7px 14px', fontSize: 12.5 }}>+ Agregar</button>
        </div>
        {mechanics.length === 0 && <div style={emptyState(t, 'Sin mecánicos registrados')} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mechanics.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}` }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>{m.name}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>{m.role}{m.specialty ? ` · ${m.specialty}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={() => updateMechanic(m.id, { active: !m.active })} style={{
                  fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: m.active ? 'rgba(46,204,113,0.14)' : 'rgba(255,77,106,0.12)', color: m.active ? t.success : t.danger,
                }}>{m.active ? 'ACTIVO' : 'INACTIVO'}</button>
                <button onClick={() => deleteMechanic(m.id)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {section === 'servicios' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700 }}>Catálogo de servicios</div>
          <button onClick={() => setServiceModal(true)} style={{ ...ghostBtnStyle(t), padding: '7px 14px', fontSize: 12.5 }}>+ Agregar</button>
        </div>
        {services.length === 0 && <div style={emptyState(t, 'Sin servicios en el catálogo')} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {services.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}` }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>{s.name}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>{s.category} · {s.estimated_hours}h</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: t.gold, fontSize: 13.5 }}>{money(s.estimated_price)}</span>
                <button onClick={() => deleteService(s.id)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {section === 'resenas' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700 }}>Reseñas ({workshop.rating.toFixed(1)}★)</div>
          <button onClick={() => setReviewModal(true)} style={{ ...ghostBtnStyle(t), padding: '7px 14px', fontSize: 12.5 }}>+ Registrar reseña</button>
        </div>
        <p style={{ fontSize: 11.5, color: t.textMuted, margin: '0 0 10px' }}>
          Registro manual de reseñas recibidas fuera de línea — se muestran en tu ficha pública.
        </p>
        {reviews.length === 0 && <div style={emptyState(t, 'Sin reseñas registradas')} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ padding: '12px 16px', borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>{r.client_name}</div>
                <span style={{ color: t.gold, fontSize: 12.5 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4 }}>{r.comment}</div>}
              {r.manager_response ? (
                <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 6 }}>Tu respuesta: {r.manager_response}</div>
              ) : respondingId === r.id ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input style={inputStyle(t)} placeholder="Responder…" value={responseText} onChange={e => setResponseText(e.target.value)} />
                  <button onClick={async () => { await respondReview(r.id, responseText); setRespondingId(null); setResponseText('') }} style={{ ...ghostBtnStyle(t), padding: '8px 14px', fontSize: 12 }}>Enviar</button>
                </div>
              ) : (
                <button onClick={() => setRespondingId(r.id)} style={{ fontSize: 11.5, color: t.gold, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6 }}>Responder</button>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {reviewModal && (
        <AdminModal isOpen onClose={() => setReviewModal(false)} title="Registrar reseña" theme={theme} maxWidth={400}
          footer={<>
            <button onClick={() => setReviewModal(false)} style={ghostBtnStyle(t)}>Cancelar</button>
            <button
              disabled={!reviewName.trim()}
              onClick={async () => {
                await addReview({ client_name: reviewName, rating: Number(reviewRating), comment: reviewComment })
                setReviewName(''); setReviewRating('5'); setReviewComment(''); setReviewModal(false)
              }}
              style={primaryBtnStyle(t, !reviewName.trim())}
            >Guardar</button>
          </>}>
          <div><label style={labelStyle(t)}>Cliente</label><input style={inputStyle(t)} value={reviewName} onChange={e => setReviewName(e.target.value)} /></div>
          <div>
            <label style={labelStyle(t)}>Calificación</label>
            <select style={inputStyle(t)} value={reviewRating} onChange={e => setReviewRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrella{n !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div><label style={labelStyle(t)}>Comentario</label><textarea rows={3} style={{ ...inputStyle(t), resize: 'vertical' }} value={reviewComment} onChange={e => setReviewComment(e.target.value)} /></div>
        </AdminModal>
      )}

      {mechanicModal && (
        <AdminModal isOpen onClose={() => setMechanicModal(false)} title="Nuevo mecánico" theme={theme} maxWidth={400}
          footer={<>
            <button onClick={() => setMechanicModal(false)} style={ghostBtnStyle(t)}>Cancelar</button>
            <button
              disabled={!mechanicName.trim()}
              onClick={async () => { await addMechanic({ name: mechanicName, role: mechanicRole }); setMechanicName(''); setMechanicRole(''); setMechanicModal(false) }}
              style={primaryBtnStyle(t, !mechanicName.trim())}
            >Guardar</button>
          </>}>
          <div><label style={labelStyle(t)}>Nombre</label><input style={inputStyle(t)} value={mechanicName} onChange={e => setMechanicName(e.target.value)} /></div>
          <div><label style={labelStyle(t)}>Cargo</label><input style={inputStyle(t)} value={mechanicRole} onChange={e => setMechanicRole(e.target.value)} placeholder="Jefe de Taller, Técnico…" /></div>
        </AdminModal>
      )}

      {serviceModal && (
        <AdminModal isOpen onClose={() => setServiceModal(false)} title="Nuevo servicio del catálogo" theme={theme} maxWidth={400}
          footer={<>
            <button onClick={() => setServiceModal(false)} style={ghostBtnStyle(t)}>Cancelar</button>
            <button
              disabled={!serviceName.trim()}
              onClick={async () => {
                await addService({ name: serviceName, category: serviceCategory, estimated_price: Number(servicePrice) || 0, estimated_hours: Number(serviceHours) || 0 })
                setServiceName(''); setServiceCategory(''); setServicePrice(''); setServiceHours(''); setServiceModal(false)
              }}
              style={primaryBtnStyle(t, !serviceName.trim())}
            >Guardar</button>
          </>}>
          <div><label style={labelStyle(t)}>Nombre</label><input style={inputStyle(t)} value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="Cambio de aceite" /></div>
          <div>
            <label style={labelStyle(t)}>Categoría</label>
            <input style={inputStyle(t)} list="service-categories" value={serviceCategory} onChange={e => setServiceCategory(e.target.value)} placeholder="Mantenimiento Preventivo" />
            <datalist id="service-categories">{SERVICE_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Precio estimado</label><input type="number" style={inputStyle(t)} value={servicePrice} onChange={e => setServicePrice(e.target.value)} /></div>
            <div><label style={labelStyle(t)}>Horas estimadas</label><input type="number" style={inputStyle(t)} value={serviceHours} onChange={e => setServiceHours(e.target.value)} /></div>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
