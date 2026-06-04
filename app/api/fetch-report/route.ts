import { NextResponse } from 'next/server'
import { fetchLatestReportEmail, fetchReportEmailByDate } from '@/lib/imap'
import { parseReportEmail } from '@/lib/parser'
import { saveReport } from '@/lib/storage'
import { detectReportType, getReportTypeConfig, DEFAULT_REPORT_TYPE } from '@/lib/report-types'
import { format } from 'date-fns'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    let targetDate: Date | undefined
    let forcedType: string | undefined

    try {
      const body = await req.json()
      if (body?.date) targetDate = new Date(body.date)
      if (body?.reportType) forcedType = body.reportType
    } catch {
      // no body or invalid JSON
    }

    const typeId = forcedType ?? DEFAULT_REPORT_TYPE
    const typeConfig = getReportTypeConfig(typeId)
    const keyword = typeConfig?.subjectKeyword
    const matcher = typeConfig?.matchSubject

    const fetched = targetDate
      ? await fetchReportEmailByDate(targetDate, keyword, matcher)
      : await fetchLatestReportEmail(keyword, matcher)

    if (!fetched) {
      return NextResponse.json({ error: `Nenalezen email s předmětem odpovídajícím typu "${typeId}"` }, { status: 404 })
    }

    const date = format(fetched.date, 'yyyy-MM-dd')
    const fetchedAt = new Date().toISOString()
    const reportType = forcedType ?? detectReportType(fetched.subject)
    const report = parseReportEmail(fetched.html, date, fetchedAt, reportType)

    await saveReport(report)

    return NextResponse.json({
      success: true,
      date,
      reportType,
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
