'use client'

import { useState, useCallback, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Report, ReportIndex, ReportKPI } from '@/types/report'
import { REPORT_TYPES } from '@/lib/report-types'
import { format, parseISO, isValid } from 'date-fns'
import { cs } from 'date-fns/locale'

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

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps { label: string; value: number; color: 'red' | 'orange' | 'blue' | 'purple' }

function KpiCard({ label, value, color }: KpiCardProps) {
  const bg = { red: 'bg-red-50 border-red-200', orange: 'bg-orange-50 border-orange-200', blue: 'bg-blue-50 border-blue-200', purple: 'bg-purple-50 border-purple-200' }[color]
  const num = { red: 'text-red-700', orange: 'text-orange-700', blue: 'text-blue-700', purple: 'text-purple-700' }[color]
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${num}`}>{value}</p>
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

interface CollapsibleProps { title: string; badge: number; badgeColor?: 'red'|'orange'|'blue'|'gray'|'purple'; children: React.ReactNode }

function CollapsibleSection({ title, badge, badgeColor = 'gray', children }: CollapsibleProps) {
  const [open, setOpen] = useState(false)
  const badgeCls = { red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700', blue: 'bg-blue-100 text-blue-700', gray: 'bg-gray-100 text-gray-600', purple: 'bg-purple-100 text-purple-700' }[badgeColor]
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeCls}`}>{badge}</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          <Suspense fallback={<div className="py-6 text-center text-sm text-gray-400">Načítám…</div>}>
            {children}
          </Suspense>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { report: Report; index: ReportIndex; activeType: string }

export default function DashboardClient({ report, index, activeType }: Props) {
  const router = useRouter()
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const handleFetch = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/fetch-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: activeType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || 'Chyba při stahování')
      } else {
        router.push(`/dashboard?type=${activeType}&date=${data.date}`)
        router.refresh()
      }
    } catch {
      setFetchError('Síťová chyba')
    } finally {
      setFetching(false)
    }
  }, [router, activeType])

  const s = report.sections
  const kpi = report.kpi
  const isEmpty = !s.sec1 && !s.sec2 && !s.sec3 && !s.sec4 && !s.sec7 && !s.sec9 && !s.sec11 && !s.sec12 && !s.sec13 && !s.sec14 && !s.sec15

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
        {/* Top row */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">Report Dashboard</span>
              <span className="ml-2 text-xs text-gray-400">Sportega</span>
            </div>
          </div>

          <button
            onClick={handleFetch}
            disabled={fetching}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {fetching ? 'Stahuje se…' : 'Načíst nový report'}
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex border-t border-gray-100 px-5">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/dashboard?type=${t.id}`)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeType === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {fetchError && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-2 text-sm text-red-600">{fetchError}</div>
        )}
      </header>

      {/* ── Body (sidebar + main) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — report history */}
        <aside className="flex w-52 flex-shrink-0 flex-col border-r border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Posledních 10 reportů</p>
          </div>
          <nav className="flex-1 overflow-y-auto">
            {index.reports.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                Žádné reporty.<br />Klikni „Načíst nový report".
              </div>
            ) : (
              <ul>
                {index.reports.map((r) => {
                  const d = parseISO(r.date)
                  const isActive = r.date === report.date
                  const hasProblems = r.kpi.sec14_count > 0 || r.kpi.sec4_count > 0
                  return (
                    <li key={r.date}>
                      <button
                        onClick={() => router.push(`/dashboard?type=${activeType}&date=${r.date}`)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                          isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                            {isValid(d) ? format(d, 'EEE d. M.', { locale: cs }) : r.date}
                          </span>
                          {hasProblems && (
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Kritické problémy" />
                          )}
                        </div>
                        <div className="mt-0.5 flex gap-2 text-xs text-gray-400">
                          {r.kpi.sec1_count > 0 && <span>D:{r.kpi.sec1_count}</span>}
                          {r.kpi.sec14_count > 0 && <span className="text-red-500">M:{r.kpi.sec14_count}</span>}
                          {r.kpi.sec4_count > 0 && <span className="text-red-500">ND:{r.kpi.sec4_count}</span>}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Report header */}
          <div className="border-b border-gray-200 bg-white px-6 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                {isValid(parseISO(report.date))
                  ? format(parseISO(report.date), "EEEE d. MMMM yyyy", { locale: cs })
                  : report.date}
              </h2>
              {report.fetchedAt && (
                <span className="text-xs text-gray-400">
                  · načteno {format(new Date(report.fetchedAt), 'H:mm', { locale: cs })}
                </span>
              )}
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard label="Doprodej bez zásoby" value={kpi.sec1_count} color="orange" />
              <KpiCard label="Nelze doručit" value={kpi.sec4_count} color="red" />
              <KpiCard label="Záporná marže" value={kpi.sec14_count} color="red" />
              <KpiCard label="Bez kategorie" value={kpi.sec13_count} color="blue" />
              <KpiCard label="Likvidace – termínů" value={kpi.sec9_terms} color="purple" />
            </div>

            {/* Sections */}
            {isEmpty ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <svg className="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500 font-medium">Žádná data k zobrazení</p>
                <p className="text-xs text-gray-400 mt-1">Klikni „Načíst nový report" pro stažení z emailu.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.sec1 && <CollapsibleSection title="1. Zapnutý v doprodeji bez zásoby" badge={s.sec1.count} badgeColor="orange"><Section1 data={s.sec1} date={report.date} /></CollapsibleSection>}
                {s.sec2 && <CollapsibleSection title="2. Saleable bez dodavatelského skladu" badge={s.sec2.dodavatele.reduce((n, d) => n + d.produkty.length, 0)} badgeColor="blue"><Section2 data={s.sec2} date={report.date} /></CollapsibleSection>}
                {s.sec3 && <CollapsibleSection title="3. WithVariant s rozdílnou cenou" badge={s.sec3.items.length} badgeColor="blue"><Section3 data={s.sec3} date={report.date} /></CollapsibleSection>}
                {s.sec4 && <CollapsibleSection title="4. Nelze doručit" badge={kpi.sec4_count} badgeColor="red"><Section4 data={s.sec4} date={report.date} /></CollapsibleSection>}
                {s.sec7 && <CollapsibleSection title="7. Dárek není skladem" badge={s.sec7.items.length} badgeColor="orange"><Section7 data={s.sec7} date={report.date} /></CollapsibleSection>}
                {s.sec9 && <CollapsibleSection title="9. Objednány k likvidaci" badge={s.sec9.terminy.length} badgeColor="purple"><Section9 data={s.sec9} date={report.date} reportDate={report.date} /></CollapsibleSection>}
                {s.sec11 && <CollapsibleSection title="11. Mimo saleable" badge={s.sec11.celkem} badgeColor="gray"><Section11 data={s.sec11} date={report.date} /></CollapsibleSection>}
                {s.sec12 && <CollapsibleSection title="12. Nezadané rozměry" badge={s.sec12.celkem_produktu} badgeColor="gray"><Section12 data={s.sec12} date={report.date} /></CollapsibleSection>}
                {s.sec13 && <CollapsibleSection title="13. Saleable bez kategorie" badge={s.sec13.items.length} badgeColor="blue"><Section13 data={s.sec13} date={report.date} /></CollapsibleSection>}
                {s.sec14 && <CollapsibleSection title="14. Záporná marže" badge={kpi.sec14_count} badgeColor="red"><Section14 data={s.sec14} date={report.date} /></CollapsibleSection>}
                {s.sec15 && <CollapsibleSection title="15. Nesoulad kategorizace" badge={s.sec15.kategorie.reduce((n, k) => n + k.produktu_mimo, 0)} badgeColor="gray"><Section15 data={s.sec15} date={report.date} /></CollapsibleSection>}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
