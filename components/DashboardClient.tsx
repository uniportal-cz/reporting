'use client'

import { useState, useCallback, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Report, ReportIndex, ReportKPI } from '@/types/report'
import { format, parseISO, addDays, subDays, isValid } from 'date-fns'
import { cs } from 'date-fns/locale'

// Lazy section imports
const Section1 = lazy(() => import('./sections/Section1'))
const Section2 = lazy(() => import('./sections/Section2'))
const Section3 = lazy(() => import('./sections/Section3'))
const Section4 = lazy(() => import('./sections/Section4'))
const Section7 = lazy(() => import('./sections/Section7'))
const Section9 = lazy(() => import('./sections/Section9'))
const Section11 = lazy(() => import('./sections/Section11'))
const Section12 = lazy(() => import('./sections/Section12'))
const Section13 = lazy(() => import('./sections/Section13'))
const Section14 = lazy(() => import('./sections/Section14'))
const Section15 = lazy(() => import('./sections/Section15'))

interface KpiCardProps {
  label: string
  value: number
  color: 'red' | 'orange' | 'blue' | 'purple'
}

function KpiCard({ label, value, color }: KpiCardProps) {
  const colorClass = {
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }[color]

  const numClass = {
    red: 'text-red-900',
    orange: 'text-orange-900',
    blue: 'text-blue-900',
    purple: 'text-purple-900',
  }[color]

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${numClass}`}>{value}</p>
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  badge: number
  badgeColor?: 'red' | 'orange' | 'blue' | 'gray' | 'purple'
  children: React.ReactNode
}

function CollapsibleSection({ title, badge, badgeColor = 'gray', children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false)

  const badgeClass = {
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-600',
    purple: 'bg-purple-100 text-purple-700',
  }[badgeColor]

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-gray-800">{title}</span>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}>
            {badge}
          </span>
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 py-4">
          <Suspense fallback={<div className="py-8 text-center text-sm text-gray-400">Načítám...</div>}>
            {children}
          </Suspense>
        </div>
      )}
    </div>
  )
}

interface Props {
  report: Report
  index: ReportIndex
}

export default function DashboardClient({ report, index }: Props) {
  const router = useRouter()
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const currentDate = parseISO(report.date)
  const dates = index.reports.map((r) => r.date).sort()
  const currentIdx = dates.indexOf(report.date)

  const prevDate = currentIdx > 0 ? dates[currentIdx - 1] : null
  const nextDate = currentIdx < dates.length - 1 ? dates[currentIdx + 1] : null

  const handleFetch = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/fetch-report', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || 'Chyba při stahování')
      } else {
        router.push(`/dashboard?date=${data.date}`)
        router.refresh()
      }
    } catch (e) {
      setFetchError('Síťová chyba')
    } finally {
      setFetching(false)
    }
  }, [router])

  const s = report.sections
  const kpi = report.kpi

  const formattedDate = isValid(currentDate)
    ? format(currentDate, 'd. MMMM yyyy', { locale: cs })
    : report.date

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Report Dashboard</h1>
              <p className="text-sm text-gray-500">Sportega</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Date navigation */}
              <div className="flex items-center gap-1">
                <button
                  disabled={!prevDate}
                  onClick={() => prevDate && router.push(`/dashboard?date=${prevDate}`)}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  title="Předchozí report"
                >
                  ←
                </button>

                <select
                  value={report.date}
                  onChange={(e) => router.push(`/dashboard?date=${e.target.value}`)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...dates].reverse().map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <button
                  disabled={!nextDate}
                  onClick={() => nextDate && router.push(`/dashboard?date=${nextDate}`)}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  title="Novější report"
                >
                  →
                </button>
              </div>

              <span className="hidden text-sm text-gray-500 sm:block">{formattedDate}</span>

              <button
                onClick={handleFetch}
                disabled={fetching}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {fetching ? 'Stahuje se…' : 'Načíst nový report'}
              </button>
            </div>
          </div>

          {fetchError && (
            <p className="mt-2 text-sm text-red-600">{fetchError}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Doprodej bez zásoby" value={kpi.sec1_count} color="orange" />
          <KpiCard label="Nelze doručit" value={kpi.sec4_count} color="red" />
          <KpiCard label="Záporná marže" value={kpi.sec14_count} color="red" />
          <KpiCard label="Bez kategorie" value={kpi.sec13_count} color="blue" />
          <KpiCard label="Likvidace – termínů" value={kpi.sec9_terms} color="purple" />
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {s.sec1 && (
            <CollapsibleSection
              title="1. Zapnutý v doprodeji bez zásoby"
              badge={s.sec1.count}
              badgeColor="orange"
            >
              <Section1 data={s.sec1} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec2 && (
            <CollapsibleSection
              title="2. Saleable bez dodavatelského skladu"
              badge={s.sec2.dodavatele.reduce((sum, d) => sum + d.produkty.length, 0)}
              badgeColor="blue"
            >
              <Section2 data={s.sec2} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec3 && (
            <CollapsibleSection
              title="3. WithVariant s rozdílnou cenou"
              badge={s.sec3.items.length}
              badgeColor="blue"
            >
              <Section3 data={s.sec3} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec4 && (
            <CollapsibleSection
              title="4. Nelze doručit"
              badge={kpi.sec4_count}
              badgeColor="red"
            >
              <Section4 data={s.sec4} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec7 && (
            <CollapsibleSection
              title="7. Dárek není skladem"
              badge={s.sec7.items.length}
              badgeColor="orange"
            >
              <Section7 data={s.sec7} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec9 && (
            <CollapsibleSection
              title="9. Objednány k likvidaci"
              badge={s.sec9.terminy.length}
              badgeColor="purple"
            >
              <Section9 data={s.sec9} date={report.date} reportDate={report.date} />
            </CollapsibleSection>
          )}

          {s.sec11 && (
            <CollapsibleSection
              title="11. Mimo saleable"
              badge={s.sec11.celkem}
              badgeColor="gray"
            >
              <Section11 data={s.sec11} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec12 && (
            <CollapsibleSection
              title="12. Nezadané rozměry"
              badge={s.sec12.celkem_produktu}
              badgeColor="gray"
            >
              <Section12 data={s.sec12} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec13 && (
            <CollapsibleSection
              title="13. Saleable bez kategorie"
              badge={s.sec13.items.length}
              badgeColor="blue"
            >
              <Section13 data={s.sec13} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec14 && (
            <CollapsibleSection
              title="14. Záporná marže"
              badge={kpi.sec14_count}
              badgeColor="red"
            >
              <Section14 data={s.sec14} date={report.date} />
            </CollapsibleSection>
          )}

          {s.sec15 && (
            <CollapsibleSection
              title="15. Nesoulad kategorizace"
              badge={s.sec15.kategorie.reduce((sum, k) => sum + k.produktu_mimo, 0)}
              badgeColor="gray"
            >
              <Section15 data={s.sec15} date={report.date} />
            </CollapsibleSection>
          )}

          {!s.sec1 && !s.sec2 && !s.sec3 && !s.sec4 && !s.sec7 && !s.sec9 && !s.sec11 && !s.sec12 && !s.sec13 && !s.sec14 && !s.sec15 && (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <p className="text-gray-500">Žádná data pro tento report. Report byl pravděpodobně prázdný nebo se nepodařilo naparsovat.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
