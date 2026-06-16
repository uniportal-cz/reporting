import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoogleAuthUrl } from '@/lib/search-console'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })
  }

  const state = session.user.id
  const url = getGoogleAuthUrl(state)
  return NextResponse.redirect(url)
}
