import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  // Antes usaba el cliente singleton de lib/supabase.ts (solo anon key, sin
  // el JWT del caller) — la query de abajo corría como el rol `anon` sin
  // auth.uid(), así que la política RLS de vehicle_transfers ("Users can
  // read own transfers", que exige auth.uid() = from_user_id/to_user_id) la
  // bloqueaba siempre y esta lista devolvía vacío para cualquiera.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
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