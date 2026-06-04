import { loadIndex, loadReport } from '@/lib/storage'
import DashboardClient from '@/components/DashboardClient'
import { redirect } from 'next/navigation'
import type { Report, ReportIndex } from '@/types/report'
import { REPORT_TYPES, DEFAULT_REPORT_TYPE } from '@/lib/report-types'

interface Props {
  searchParams: { date?: string; type?: string }
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: Props) {
  const activeType = REPORT_TYPES.find((t) => t.id === searchParams.type)?.id ?? DEFAULT_REPORT_TYPE

  const fullIndex: ReportIndex = await loadIndex()
  // Filter to last 10 for this type
  const typeReports = fullIndex.reports
    .filter((r) => (r.reportType ?? 'obchodni') === activeType)
    .slice(0, 10)
  const filteredIndex: ReportIndex = { reports: typeReports }

  let targetDate = searchParams.date
  if (!targetDate && typeReports.length > 0) {
    targetDate = typeReports[0].date
  }

  const emptyReport = (date: string): Report => ({
    date,
    reportType: activeType,
    fetchedAt: new Date().toISOString(),
    kpi: { sec1_count: 0, sec4_count: 0, sec14_count: 0, sec13_count: 0, sec9_terms: 0 },
    sections: {},
  })

  if (!targetDate || typeReports.length === 0) {
    return (
      <DashboardClient
        report={emptyReport(new Date().toISOString().slice(0, 10))}
        index={filteredIndex}
        activeType={activeType}
      />
    )
  }

  const report = await loadReport(targetDate)
  if (!report) {
    if (typeReports.length > 0) {
      redirect(`/dashboard?type=${activeType}&date=${typeReports[0].date}`)
    }
    return (
      <DashboardClient
        report={emptyReport(targetDate)}
        index={filteredIndex}
        activeType={activeType}
      />
    )
  }

  return <DashboardClient report={report} index={filteredIndex} activeType={activeType} />
}
