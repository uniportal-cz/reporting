import { loadIndex, loadReport } from '@/lib/storage'
import DashboardClient from '@/components/DashboardClient'
import { redirect } from 'next/navigation'
import type { Report, ReportIndex } from '@/types/report'

interface Props {
  searchParams: { date?: string }
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: Props) {
  const index: ReportIndex = await loadIndex()

  // Pick the date to show
  let targetDate = searchParams.date
  if (!targetDate && index.reports.length > 0) {
    targetDate = index.reports[0].date // most recent (sorted desc)
  }

  if (!targetDate || index.reports.length === 0) {
    // No reports yet — show empty state
    const emptyReport: Report = {
      date: new Date().toISOString().slice(0, 10),
      fetchedAt: new Date().toISOString(),
      kpi: { sec1_count: 0, sec4_count: 0, sec14_count: 0, sec13_count: 0, sec9_terms: 0 },
      sections: {},
    }
    const emptyIndex: ReportIndex = { reports: [] }
    return <DashboardClient report={emptyReport} index={emptyIndex} />
  }

  const report = await loadReport(targetDate)
  if (!report) {
    // Date requested but not found — show most recent
    if (index.reports.length > 0) {
      redirect(`/dashboard?date=${index.reports[0].date}`)
    }
    const emptyReport: Report = {
      date: targetDate,
      fetchedAt: new Date().toISOString(),
      kpi: { sec1_count: 0, sec4_count: 0, sec14_count: 0, sec13_count: 0, sec9_terms: 0 },
      sections: {},
    }
    return <DashboardClient report={emptyReport} index={index} />
  }

  return <DashboardClient report={report} index={index} />
}
