import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vehicleId } = await params
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { toEmail, expiresInDays = 7, transferData = {} } = body

    if (!toEmail || !toEmail.includes('@')) {
      return NextResponse.json({ error: 'Email destino requerido' }, { status: 400 })
    }

    // Verify vehicle ownership
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, owner_id, plate, brand, model, year, status')
      .eq('id', vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
    }
    if (vehicle.owner_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para transferir este vehículo' }, { status: 403 })
    }
    if (vehicle.status !== 'active') {
      return NextResponse.json({ error: 'El vehículo no está disponible para transferencia' }, { status: 400 })
    }

    // Check for existing pending transfer
    const { data: existingTransfer } = await supabase
      .from('vehicle_transfers')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingTransfer) {
      return NextResponse.json({ error: 'Ya hay una transferencia pendiente para este vehículo' }, { status: 400 })
    }

    // Find or create recipient user
    let toUserId = null
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', toEmail.toLowerCase())
      .single()
    
    if (recipient) {
      toUserId = recipient.id
      if (toUserId === user.id) {
        return NextResponse.json({ error: 'No puedes transferirte a ti mismo' }, { status: 400 })
      }
    }

    // Create transfer
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { data: transfer, error: transferError } = await supabase
      .from('vehicle_transfers')
      .insert({
        vehicle_id: vehicleId,
        from_user_id: user.id,
        to_user_id: toUserId,
        to_email: toEmail.toLowerCase(),
        transfer_data: transferData,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })
      .select()
      .single()

    if (transferError) {
      console.error('Transfer creation error:', transferError)
      return NextResponse.json({ error: 'Error creando transferencia' }, { status: 500 })
    }

    // TODO: Send email notification to recipient
    // await sendTransferEmail(toEmail, transfer.id, vehicle)

    return NextResponse.json({
      success: true,
      transfer: {
        id: transfer.id,
        vehicleId: vehicleId,
        toEmail: toEmail,
        expiresAt: transfer.expires_at,
        status: transfer.status,
      }
    })
  } catch (e: any) {
    console.error('Transfer API error:', e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}