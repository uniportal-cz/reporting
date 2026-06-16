import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoogleTokens } from '@/lib/users'
import { listGscSites } from '@/lib/search-console'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })
  }

  const tokens = await getGoogleTokens(session.user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'Google účet není připojen' }, { status: 400 })
  }

  try {
    const sites = await listGscSites(tokens)
    return NextResponse.json(sites)
  } catch (err) {
    console.error('GSC sites error:', err)
    return NextResponse.json({ error: 'Chyba při načítání stránek ze Search Console' }, { status: 500 })
  }
}
