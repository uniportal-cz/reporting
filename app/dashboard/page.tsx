import { loadIndex, loadReport } from '@/lib/storage'
import DashboardClient from '@/components/DashboardClient'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import type { Report, ReportIndex } from '@/types/report'
import { REPORT_TYPES, DEFAULT_REPORT_TYPE } from '@/lib/report-types'

export interface StorageStatus {
  backend: string
  persistent: boolean
  detail: string
}

interface Props {
  searchParams: Promise<{ date?: string; type?: string }>
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
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const { date: rawDate, type: rawType } = await searchParams
  const activeType = REPORT_TYPES.find((t) => t.id === rawType)?.id ?? DEFAULT_REPORT_TYPE
  const storageStatus = getStorageStatus()

  const fullIndex: ReportIndex = await loadIndex()
  const typeReports = fullIndex.reports
    .filter((r) => (r.reportType ?? 'obchodni') === activeType)
    .slice(0, 10)
  const filteredIndex: ReportIndex = { reports: typeReports }

  let targetDate = rawDate
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

  const isAdmin = (session.user as { role?: string }).role === 'admin'

  const navBar = (
    <div className="bg-white border-b px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-4">
        <span className="font-medium text-gray-700">Dashboard</span>
        <a href="/dashboard/search-console" className="text-blue-600 hover:underline">Search Console</a>
        {isAdmin && <a href="/dashboard/users" className="text-purple-600 hover:underline">Uživatelé</a>}
      </div>
      <div className="flex items-center gap-3 text-gray-500">
        <span>{session.user.name}</span>
        <form action={async () => {
          'use server'
          await signOut({ redirectTo: '/auth/login' })
        }}>
          <button type="submit" className="text-red-500 hover:underline">Odhlásit</button>
        </form>
      </div>
    </div>
  )

  if (!targetDate || typeReports.length === 0) {
    return (
      <>
        {navBar}
        <DashboardClient
          report={emptyReport(new Date().toISOString().slice(0, 10))}
          index={filteredIndex}
          activeType={activeType}
          storageStatus={storageStatus}
        />
      </>
    )
  }

  const report = await loadReport(targetDate)
  if (!report) {
    if (typeReports.length > 0) {
      redirect(`/dashboard?type=${activeType}&date=${typeReports[0].date}`)
    }
    return (
      <>
        {navBar}
        <DashboardClient
          report={emptyReport(targetDate)}
          index={filteredIndex}
          activeType={activeType}
          storageStatus={storageStatus}
        />
      </>
    )
  }

  return (
    <>
      {navBar}
      <DashboardClient
        report={report}
        index={filteredIndex}
        activeType={activeType}
        storageStatus={storageStatus}
      />
    </>
  )
}
