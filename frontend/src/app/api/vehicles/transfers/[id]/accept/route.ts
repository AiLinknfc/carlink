import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    // Get transfer details
    const { data: transfer, error: transferError } = await supabase
      .from('vehicle_transfers')
      .select('*, vehicles!inner(*)')
      .eq('id', id)
      .single()

    if (transferError || !transfer) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 })
    }

    if (transfer.status !== 'pending') {
      return NextResponse.json({ error: 'Transferencia no está pendiente' }, { status: 400 })
    }

    if (new Date(transfer.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Transferencia expirada' }, { status: 400 })
    }

    // Verify the current user is the intended recipient. BUG FIJADO
    // (2026-08-09): antes este chequeo estaba dentro de
    // `if (transfer.to_user_id && ...)` — si to_user_id era null (el caso
    // normal: se invita por email a alguien que todavía no tiene cuenta, ver
    // [id]/transfer/route.ts) el chequeo entero se saltaba y CUALQUIER
    // usuario autenticado que supiera el id de una transferencia pendiente
    // podía aceptarla y quedarse con el vehículo de otra persona. Ahora se
    // verifica siempre, sin condición previa.
    if (transfer.to_user_id !== user.id) {
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single()
      if (!profile?.email || profile.email.toLowerCase() !== transfer.to_email?.toLowerCase()) {
        return NextResponse.json({ error: 'No autorizado para esta transferencia' }, { status: 403 })
      }
    }

    // Get vehicle data
    const vehicle = transfer.vehicles
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
    }

    // Check if vehicle is still owned by the sender
    if (vehicle.owner_id !== transfer.from_user_id) {
      return NextResponse.json({ error: 'El vehículo ya no pertenece al remitente' }, { status: 400 })
    }

    const transferData = transfer.transfer_data || {}
    // token.id -> true ("va con el vehículo", se reasigna) | false/ausente
    // ("me lo quedo", se revoca — default seguro). Ver docs/PENDIENTES.md
    // ítem 11: antes esto era un solo checkbox global que revocaba TODOS
    // los llaveros activos o ninguno, sin poder elegir por llavero.
    const nfcTokenChoices: Record<string, boolean> = transferData.nfcTokenChoices || {}

    // Update vehicle ownership
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({
        owner_id: user.id,
        status: 'transferred',
        transferred_at: new Date().toISOString(),
        transferred_to_user_id: user.id,
        original_owner_id: vehicle.original_owner_id || vehicle.owner_id,
      })
      .eq('id', vehicle.id)

    if (vehicleError) {
      console.error('Vehicle update error:', vehicleError)
      return NextResponse.json({ error: 'Error actualizando vehículo' }, { status: 500 })
    }

    // Llaveros: hecho DESPUÉS de mover vehicles.owner_id (arriba) y
    // ANTES de marcar la transferencia 'completed' (abajo) — orden real,
    // no cosmético. La política RLS ya existente de nfc_tokens
    // ("Users can update own vehicle tokens", migración 041) autoriza por
    // `vehicles.owner_id = auth.uid()`, así que recién funciona una vez que
    // el paso de arriba ya puso al comprador como dueño del vehículo — no
    // hizo falta ninguna política nueva. Confirmado con simulación de rol
    // real (SET LOCAL role authenticated + request.jwt.claims) contra la
    // base: en el orden correcto el comprador puede reasignar/revocar; en
    // el orden invertido (llaveros antes que el vehículo) queda bloqueado,
    // igual que un tercero ajeno a la transferencia — ver docs/PENDIENTES.md
    // ítem 11.
    //
    // Un llavero activo sobre un vehículo que ya no es tuyo no debería
    // sobrevivir a la transferencia — por eso cualquier token que el
    // vendedor no haya marcado explícitamente "va con el vehículo" se
    // revoca, nunca queda activo bajo el dueño anterior (mismo criterio
    // para uno que el vendedor se quedó, uno que se le olvidó, o uno
    // perdido sin revocar). Solo alcanza a llaveros personales — los trial
    // son de cuentas taller, no de compraventa entre personas.
    const { data: activeTokens } = await supabase
      .from('nfc_tokens')
      .select('id')
      .eq('vehicle_id', vehicle.id)
      .eq('is_active', true)
      .eq('token_type', 'personal')

    for (const token of activeTokens || []) {
      if (nfcTokenChoices[token.id]) {
        const { error: reassignError } = await supabase
          .from('nfc_tokens')
          .update({ user_id: user.id })
          .eq('id', token.id)
        if (reassignError) console.error('NFC token reassign error:', token.id, reassignError)
      } else {
        const { error: revokeError } = await supabase
          .from('nfc_tokens')
          .update({ is_active: false, status: 'revoked' })
          .eq('id', token.id)
        if (revokeError) console.error('NFC token revoke error:', token.id, revokeError)
      }
    }

    // Update transfer status
    const { error: transferUpdateError } = await supabase
      .from('vehicle_transfers')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        to_user_id: user.id,
      })
      .eq('id', id)

    if (transferUpdateError) {
      console.error('Transfer update error:', transferUpdateError)
    }

    // Notify sender (could be an in-app notification or email)
    // For now just log
    console.log(`Vehicle ${vehicle.id} transferred from ${transfer.from_user_id} to ${user.id}`)

    return NextResponse.json({ 
      success: true, 
      vehicleId: vehicle.id,
      message: 'Transferencia completada exitosamente'
    })

  } catch (e: any) {
    console.error('Accept transfer error:', e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'