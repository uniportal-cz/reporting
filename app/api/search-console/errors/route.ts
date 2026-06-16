import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getGoogleTokens } from '@/lib/users'
import { getOrRefreshErrors } from '@/lib/search-console'

export const runtime = 'nodejs'
export const maxDuration = 60

const querySchema = z.object({
  site: z.string().url(),
  refresh: z.string().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    site: url.searchParams.get('site') ?? '',
    refresh: url.searchParams.get('refresh') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Chybí parametr site' }, { status: 400 })
  }

  const tokens = await getGoogleTokens(session.user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'Google účet není připojen' }, { status: 400 })
  }

  try {
    const data = await getOrRefreshErrors(tokens, parsed.data.site, parsed.data.refresh === '1')
    return NextResponse.json(data)
  } catch (err) {
    console.error('GSC errors error:', err)
    return NextResponse.json({ error: 'Chyba při načítání chyb ze Search Console' }, { status: 500 })
  }
}
