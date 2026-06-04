import { NextResponse } from 'next/server'
import { fetchEmails } from '@/lib/imap'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const emails = await fetchEmails(200)
    return NextResponse.json(emails)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Neznámá chyba'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
