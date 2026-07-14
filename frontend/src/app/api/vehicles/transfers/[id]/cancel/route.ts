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

    const { data: transfer, error: transferError } = await supabase
      .from('vehicle_transfers')
      .select('*')
      .eq('id', id)
      .single()

    if (transferError || !transfer) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 })
    }

    if (transfer.from_user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para cancelar esta transferencia' }, { status: 403 })
    }

    if (transfer.status !== 'pending') {
      return NextResponse.json({ error: 'Solo se pueden cancelar transferencias pendientes' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = body.reason || 'Cancelada por el vendedor'

    const { error: updateError } = await supabase
      .from('vehicle_transfers')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Cancel update error:', updateError)
      return NextResponse.json({ error: 'Error cancelando transferencia' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Transferencia cancelada' })

  } catch (e: any) {
    console.error('Cancel transfer error:', e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'