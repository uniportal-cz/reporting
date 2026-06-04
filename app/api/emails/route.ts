import { NextResponse } from 'next/server'
import { listReportEmails } from '@/lib/imap'
import { getReportTypeConfig, DEFAULT_REPORT_TYPE } from '@/lib/report-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const typeId = url.searchParams.get('type') || DEFAULT_REPORT_TYPE
    const typeConfig = getReportTypeConfig(typeId)

    const emails = await listReportEmails(
      typeConfig?.subjectKeyword,
      typeConfig?.matchSubject,
      50
    )

    return NextResponse.json(
      emails.map(e => ({
        uid: e.uid,
        subject: e.subject,
        date: e.date.toISOString(),
        seen: e.seen,
      }))
    )
  } catch (error) {
    console.error('GET /api/emails error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
