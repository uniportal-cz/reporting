import { NextResponse } from 'next/server'
import { fetchEmailDetail } from '@/lib/imap'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_: Request, { params }: { params: { uid: string } }) {
  try {
    const uid = parseInt(params.uid)
    if (isNaN(uid)) {
      return NextResponse.json({ error: 'Neplatné UID' }, { status: 400 })
    }
    const email = await fetchEmailDetail(uid)
    if (!email) {
      return NextResponse.json({ error: 'Email nenalezen' }, { status: 404 })
    }
    return NextResponse.json(email)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Neznámá chyba'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
