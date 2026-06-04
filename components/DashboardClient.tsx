'use client'

import { useState, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Report, ReportIndex } from '@/types/report'
import { REPORT_TYPES } from '@/lib/report-types'
import type { StorageStatus } from '@/app/dashboard/page'
import { format, parseISO, isValid } from 'date-fns'
import { cs } from 'date-fns/locale'
import EmailBrowser from './EmailBrowser'

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

interface Props { report: Report; index: ReportIndex; activeType: string; storageStatus: StorageStatus }

export default function DashboardClient({ report: serverReport, index, activeType, storageStatus }: Props) {
  const router = useRouter()
  // liveReport: set immediately from POST response, no DB round-trip needed
  const [liveReport, setLiveReport] = useState<Report | null>(null)
  const report = liveReport ?? serverReport

  const s = report.sections
  const kpi = report.kpi
  const isEmpty = !s.sec1 && !s.sec2 && !s.sec3 && !s.sec4 && !s.sec7 && !s.sec9 && !s.sec11 && !s.sec12 && !s.sec13 && !s.sec14 && !s.sec15

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">

      {/* ── Storage warning banner ── */}
      {!storageStatus.persistent && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 text-xs text-amber-800">
            <span className="font-semibold">Databáze není nakonfigurována ({storageStatus.backend}).</span>
            {' '}{storageStatus.detail}
            <a href="/api/debug/storage" target="_blank" rel="noreferrer" className="ml-2 underline font-medium">Zkontrolovat stav →</a>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
        {/* Top row */}
        <div className="flex items-center px-5 py-3">
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
        </div>

        {/* Type tabs + compare button */}
        <div className="flex items-center border-t border-gray-100 px-5">
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
          <div className="ml-auto">
            <button
              onClick={() => router.push(`/dashboard/compare?type=${activeType}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Srovnat
            </button>
          </div>
        </div>
      </header>

      {/* ── Body (sidebar + main) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — email browser */}
        <EmailBrowser
          activeType={activeType}
          loadedDates={index.reports.map(r => r.date)}
          onReportLoaded={(date, fetchedReport) => {
            setLiveReport(fetchedReport)
            router.push(`/dashboard?type=${activeType}&date=${date}`)
          }}
        />

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
