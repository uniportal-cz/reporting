import { loadIndex, loadReport } from '@/lib/storage'
import { REPORT_TYPES, DEFAULT_REPORT_TYPE } from '@/lib/report-types'
import CompareClient from '@/components/CompareClient'
import type { Report } from '@/types/report'

interface Props {
  searchParams: { type?: string; dates?: string }
}

export const dynamic = 'force-dynamic'

export default async function ComparePage({ searchParams }: Props) {
  const activeType = REPORT_TYPES.find((t) => t.id === searchParams.type)?.id ?? DEFAULT_REPORT_TYPE

  const fullIndex = await loadIndex()
  const typeReports = fullIndex.reports
    .filter((r) => (r.reportType ?? 'obchodni') === activeType)
    .slice(0, 30)

  // Load reports for selected dates (or last 5 available)
  const selectedDates = searchParams.dates
    ? searchParams.dates.split(',').filter(Boolean)
    : typeReports.slice(0, 5).map((r) => r.date)

  const reports: Report[] = []
  for (const date of selectedDates) {
    const r = await loadReport(date)
    if (r) reports.push(r)
  }

  return (
    <CompareClient
      reports={reports}
      allDates={typeReports.map((r) => r.date)}
      selectedDates={selectedDates}
      activeType={activeType}
    />
  )
}
