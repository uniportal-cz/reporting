import { loadIndex, loadReport } from '@/lib/storage'
import DashboardClient from '@/components/DashboardClient'
import { redirect } from 'next/navigation'
import type { Report, ReportIndex } from '@/types/report'
import { REPORT_TYPES, DEFAULT_REPORT_TYPE } from '@/lib/report-types'

export interface StorageStatus {
  backend: string
  persistent: boolean
  detail: string
}

interface Props {
  searchParams: { date?: string; type?: string }
}

export const dynamic = 'force-dynamic'

function getStorageStatus(): StorageStatus {
  const isVercel = process.env.VERCEL === '1'
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
  if (hasBlobToken) {
    return { backend: 'Vercel Blob', persistent: true, detail: 'Data jsou trvale uložena v Vercel Blob storage.' }
  }
  if (isVercel) {
    return {
      backend: '/tmp',
      persistent: false,
      detail: 'BLOB_READ_WRITE_TOKEN není nastaven. Data nepřežijí restart. Nastav Vercel Blob store: Vercel dashboard → Storage → Create → Blob → Connect to project.',
    }
  }
  return { backend: 'filesystem', persistent: true, detail: 'Lokální vývoj — ./data/reports/' }
}

export default async function DashboardPage({ searchParams }: Props) {
  const activeType = REPORT_TYPES.find((t) => t.id === searchParams.type)?.id ?? DEFAULT_REPORT_TYPE
  const storageStatus = getStorageStatus()

  const fullIndex: ReportIndex = await loadIndex()
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
        storageStatus={storageStatus}
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
        storageStatus={storageStatus}
      />
    )
  }

  return (
    <DashboardClient
      report={report}
      index={filteredIndex}
      activeType={activeType}
      storageStatus={storageStatus}
    />
  )
}
