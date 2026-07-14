import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: transferId } = await params

  try {
    const { data: transfer, error } = await supabase
      .from('vehicle_transfers')
      .select(`
        *,
        vehicle:vehicles(id, plate, brand, model, year, color, status, city),
        from_user:profiles!vehicle_transfers_from_user_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('id', transferId)
      .single()

    if (error || !transfer) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 })
    }

    const now = new Date()
    const expiresAt = new Date(transfer.expires_at)
    const isExpired = expiresAt < now
    const isPending = transfer.status === 'pending'
    const isValid = isPending && !isExpired

    } catch (e: any) {
    console.error('Validate transfer error:', e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}