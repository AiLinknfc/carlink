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

    // Verify the current user is the intended recipient
    if (transfer.to_user_id && transfer.to_user_id !== user.id) {
      // Allow if email matches
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single()
      if (profile?.email?.toLowerCase() !== transfer.to_email?.toLowerCase()) {
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

    // Handle NFC token if revocation requested
    if (transferData.revokeNfc) {
      await supabase
        .from('nfc_tokens')
        .update({ is_active: false, status: 'revoked' })
        .eq('vehicle_id', vehicle.id)
        .eq('is_active', true)
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