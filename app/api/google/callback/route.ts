import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { exchangeCodeForTokens } from '@/lib/search-console'
import { saveGoogleTokens } from '@/lib/users'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/dashboard/search-console?error=cancelled', req.url))
  }

  const session = await auth()
  if (!session?.user || session.user.id !== state) {
    return NextResponse.redirect(new URL('/dashboard/search-console?error=auth', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/search-console?error=no_code', req.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    await saveGoogleTokens(session.user.id, tokens)
    return NextResponse.redirect(new URL('/dashboard/search-console?connected=1', req.url))
  } catch (err) {
    console.error('Google callback error:', err)
    return NextResponse.redirect(new URL('/dashboard/search-console?error=token_exchange', req.url))
  }
}
