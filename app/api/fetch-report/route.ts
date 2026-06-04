import { NextResponse } from 'next/server'
import { fetchLatestReportEmail, fetchReportEmailByDate } from '@/lib/imap'
import { parseReportEmail } from '@/lib/parser'
import { saveReport } from '@/lib/storage'
import { format } from 'date-fns'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    let targetDate: Date | undefined

    try {
      const body = await req.json()
      if (body?.date) {
        targetDate = new Date(body.date)
      }
    } catch {
      // no body or invalid JSON
    }

    const fetched = targetDate
      ? await fetchReportEmailByDate(targetDate)
      : await fetchLatestReportEmail()

    if (!fetched) {
      return NextResponse.json({ error: 'No report email found' }, { status: 404 })
    }

    const date = format(fetched.date, 'yyyy-MM-dd')
    const fetchedAt = new Date().toISOString()
    const report = parseReportEmail(fetched.html, date, fetchedAt)

    await saveReport(report)

    return NextResponse.json({
      success: true,
      date,
      subject: fetched.subject,
      kpi: report.kpi,
    })
  } catch (error) {
    console.error('POST /api/fetch-report error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
