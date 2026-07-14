import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'sent' | 'received' | 'all'
    const status = searchParams.get('status') // 'pending' | 'completed' | 'cancelled' | 'expired'

    let query = supabase
      .from('vehicle_transfers')
      .select(`
        *,
        vehicle:vehicles(id, plate, brand, model, year, color, status),
        from_user:profiles!vehicle_transfers_from_user_id_fkey(id, full_name, email),
        to_user:profiles!vehicle_transfers_to_user_id_fkey(id, full_name, email)
      `)

    if (type === 'sent') {
      query = query.eq('from_user_id', user.id)
    } else if (type === 'received') {
      query = query.eq('to_user_id', user.id)
    } else {
      query = query.or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false }).limit(50)

    const { data: transfers, error } = await query

    if (error) {
      console.error('Transfers list error:', error)
      return NextResponse.json({ error: 'Error listando transferencias' }, { status: 500 })
    }

    return NextResponse.json({ transfers: transfers || [] })
  } catch (e: any) {
    console.error('Transfers list error:', e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}