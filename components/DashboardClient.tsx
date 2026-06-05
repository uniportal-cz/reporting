'use client'

import { useState, lazy, Suspense, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Report, ReportIndex, ReportKPI } from '@/types/report'
import { REPORT_TYPES } from '@/lib/report-types'
import type { StorageStatus } from '@/app/dashboard/page'
import { format, parseISO, isValid } from 'date-fns'
import { cs } from 'date-fns/locale'
import EmailBrowser, { type EmailSummary } from './EmailBrowser'

const Section1 = lazy(() => import('./sections/Section1'))
const Section2 = lazy(() => import('./sections/Section2'))
const Section3 = lazy(() => import('./sections/Section3'))
const Section4 = lazy(() => import('./sections/Section4'))
const Section5 = lazy(() => import('./sections/Section5'))
const Section6 = lazy(() => import('./sections/Section6'))
const Section7 = lazy(() => import('./sections/Section7'))
const Section8 = lazy(() => import('./sections/Section8'))
const Section9 = lazy(() => import('./sections/Section9'))
const Section10 = lazy(() => import('./sections/Section10'))
const Section11 = lazy(() => import('./sections/Section11'))
const Section12 = lazy(() => import('./sections/Section12'))
const Section13 = lazy(() => import('./sections/Section13'))
const Section14 = lazy(() => import('./sections/Section14'))
const Section15 = lazy(() => import('./sections/Section15'))

// ─── KPI Chip Bar ────────────────────────────────────────────────────────────

interface KpiChip {
  id: string
  label: string
  value: number | undefined
  prev: number | undefined
  color: 'red' | 'orange' | 'blue' | 'purple' | 'gray'
}

function getDelta(curr: number | undefined, prev: number | undefined): number | null {
  if (curr === undefined || prev === undefined) return null
  return curr - prev
}

function KpiChipBar({ chips }: { chips: KpiChip[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 scrollbar-thin">
      {chips.map((chip) => {
        const v = chip.value
        const delta = getDelta(chip.value, chip.prev)
        const colorCls = {
          red: 'border-red-200 bg-red-50',
          orange: 'border-orange-200 bg-orange-50',
          blue: 'border-blue-200 bg-blue-50',
          purple: 'border-purple-200 bg-purple-50',
          gray: 'border-gray-200 bg-gray-50',
        }[chip.color]
        const numCls = {
          red: 'text-red-700',
          orange: 'text-orange-700',
          blue: 'text-blue-700',
          purple: 'text-purple-700',
          gray: 'text-gray-700',
        }[chip.color]

        return (
          <div key={chip.id} className={`flex-shrink-0 rounded-xl border px-3 py-2 min-w-[90px] ${colorCls}`}>
            <p className="text-xs text-gray-500 leading-tight whitespace-nowrap">{chip.label}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl font-bold ${v === undefined ? 'text-gray-300' : numCls}`}>
                {v ?? '—'}
              </span>
              {delta !== null && delta !== 0 && (
                <span className={`text-xs font-semibold ${delta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

interface CollapsibleProps { title: string; badge: number; badgeColor?: 'red'|'orange'|'blue'|'gray'|'purple'; description?: string; children: React.ReactNode }

function CollapsibleSection({ title, badge, badgeColor = 'gray', description, children }: CollapsibleProps) {
  const [open, setOpen] = useState(false)
  const isEmpty = badge === 0
  const badgeCls = isEmpty
    ? 'bg-green-100 text-green-700'
    : { red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700', blue: 'bg-blue-100 text-blue-700', gray: 'bg-gray-100 text-gray-600', purple: 'bg-purple-100 text-purple-700' }[badgeColor]
  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isEmpty ? 'border-green-100' : 'border-gray-200'}`}>
      <button className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className={`font-semibold text-sm ${isEmpty ? 'text-gray-500' : 'text-gray-800'}`}>{title}</span>
          {description && <span className="text-xs text-gray-400 font-normal leading-snug">{description}</span>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeCls}`}>{isEmpty ? '✓' : badge}</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          {isEmpty ? (
            <div className="flex items-center gap-2 py-3 text-sm text-green-700">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              V pořádku — žádné položky k řešení
            </div>
          ) : (
            <Suspense fallback={<div className="py-6 text-center text-sm text-gray-400">Načítám…</div>}>
              {children}
            </Suspense>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { report: Report; index: ReportIndex; activeType: string; storageStatus: StorageStatus }

export default function DashboardClient({ report: serverReport, index, activeType, storageStatus }: Props) {
  const router = useRouter()
  const [liveReport, setLiveReport] = useState<Report | null>(null)
  const report = liveReport ?? serverReport

  const [selectedEmail, setSelectedEmail] = useState<EmailSummary | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadedUids, setLoadedUids] = useState<Set<number>>(new Set())

  function handleEmailClick(email: EmailSummary) {
    setSelectedEmail(prev => prev?.uid === email.uid ? null : email)
    setFetchError(null)
  }

  async function handleLoadReport() {
    if (!selectedEmail) return
    setFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/fetch-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: selectedEmail.uid, reportType: activeType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || 'Chyba při stahování')
      } else {
        setLoadedUids(prev => new Set(prev).add(selectedEmail.uid))
        setLiveReport(data.report)
        setSelectedEmail(null)
        router.push(`/dashboard?type=${activeType}&date=${data.date}`)
      }
    } catch {
      setFetchError('Síťová chyba')
    } finally {
      setFetching(false)
    }
  }

  const s = report.sections
  const kpi = report.kpi

  // Find previous report KPI for deltas
  const prevKpi = useMemo<ReportKPI | undefined>(() => {
    const sorted = [...index.reports]
      .filter((r) => r.reportType === activeType && r.date < report.date)
      .sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0]?.kpi
  }, [index.reports, activeType, report.date])

  const kpiChips: KpiChip[] = [
    { id: 'sec1', label: '1 Doprodej', value: kpi.sec1_count, prev: prevKpi?.sec1_count, color: 'orange' },
    { id: 'sec2', label: '2 Bez skladu', value: kpi.sec2_count, prev: prevKpi?.sec2_count, color: 'blue' },
    { id: 'sec3', label: '3 Rozdílná cena', value: kpi.sec3_count, prev: prevKpi?.sec3_count, color: 'blue' },
    { id: 'sec4', label: '4 Nelze doručit', value: kpi.sec4_count, prev: prevKpi?.sec4_count, color: 'red' },
    { id: 'sec5', label: '5 TARIC', value: kpi.sec5_count, prev: prevKpi?.sec5_count, color: 'orange' },
    { id: 'sec6', label: '6 Bez TARIC', value: kpi.sec6_count, prev: prevKpi?.sec6_count, color: 'orange' },
    { id: 'sec7', label: '7 Dárek', value: kpi.sec7_count, prev: prevKpi?.sec7_count, color: 'orange' },
    { id: 'sec8', label: '8 Kat. strom', value: kpi.sec8_count, prev: prevKpi?.sec8_count, color: 'gray' },
    { id: 'sec9', label: '9 Likvidace', value: kpi.sec9_terms, prev: prevKpi?.sec9_terms, color: 'purple' },
    { id: 'sec10', label: '10 AutoOb.', value: kpi.sec10_count, prev: prevKpi?.sec10_count, color: 'purple' },
    { id: 'sec11', label: '11 Mimo sale.', value: kpi.sec11_count, prev: prevKpi?.sec11_count, color: 'gray' },
    { id: 'sec12', label: '12 Rozměry', value: kpi.sec12_count, prev: prevKpi?.sec12_count, color: 'gray' },
    { id: 'sec13', label: '13 Bez kat.', value: kpi.sec13_count, prev: prevKpi?.sec13_count, color: 'blue' },
    { id: 'sec14', label: '14 Záp. marže', value: kpi.sec14_count, prev: prevKpi?.sec14_count, color: 'red' },
    { id: 'sec15', label: '15 Nesoulad', value: kpi.sec15_count, prev: prevKpi?.sec15_count, color: 'gray' },
  ]

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
          loadedUids={loadedUids}
          selectedUid={selectedEmail?.uid ?? null}
          onEmailClick={handleEmailClick}
        />

        {/* Main content — three states: loading / ready-to-fetch / report */}
        {fetching ? (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="relative mx-auto mb-5 w-16 h-16">
                <svg className="w-16 h-16 animate-spin text-blue-200" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <svg className="absolute inset-0 m-auto w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">Načítám report…</p>
              <p className="mt-1 text-xs text-gray-400 max-w-xs">{selectedEmail?.subject}</p>
            </div>
          </div>
        ) : selectedEmail ? (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs text-gray-400 mb-1">{selectedEmail.date.slice(0, 10)}</p>
              <h3 className="text-sm font-semibold text-gray-800 mb-5 leading-snug">{selectedEmail.subject}</h3>
              {fetchError && (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{fetchError}</p>
              )}
              <button
                onClick={handleLoadReport}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Načíst report
              </button>
              <button
                onClick={() => { setSelectedEmail(null); setFetchError(null) }}
                className="mt-2 w-full rounded-xl px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Zrušit
              </button>
            </div>
          </div>
        ) : (
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
            {/* KPI Chip Bar */}
            <KpiChipBar chips={kpiChips} />

            {/* Sections — always rendered, green when empty */}
            <div className="space-y-2">
              <CollapsibleSection
                title="1. Zapnutý produkt v doprodeji bez zásoby"
                description="Nabídka něčeho, co nejsme schopni dodat — produkt je aktivní v doprodeji, ale není k dispozici žádná zásoba."
                badge={s.sec1?.total ?? 0}
                badgeColor="orange"
              >
                {s.sec1 && <Section1 data={s.sec1} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="2. Saleable bez dodavatelského skladu"
                description="Produkt je označen jako prodejný, ale není napojen na žádný dodavatelský sklad — nelze zajistit zásobování."
                badge={s.sec2?.total ?? 0}
                badgeColor="blue"
              >
                {s.sec2 && <Section2 data={s.sec2} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="3. WithVariant s rozdílnou cenou"
                description="Variantní produkty mají nekonzistentní ceny — různé varianty téhož produktu se liší cenou, což může způsobit zobrazení špatné ceny."
                badge={s.sec3?.uniqueCount ?? 0}
                badgeColor="blue"
              >
                {s.sec3 && <Section3 data={s.sec3} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="4. Nelze doručit"
                description="Produkty, které nelze doručit — jsou aktivní, ale jejich konfigurace dopravy nebo dostupnost to neumožňuje."
                badge={kpi.sec4_count}
                badgeColor="red"
              >
                {s.sec4 && <Section4 data={s.sec4} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="5. Produkty s TARIC kódem — nelze odeslat"
                description="Produkty mají vyplněný TARIC kód, ale z technických důvodů je nelze odeslat do zahraničí."
                badge={s.sec5?.total ?? 0}
                badgeColor="orange"
              >
                {s.sec5 && <Section5 data={s.sec5} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="6. Produkty s nevyplněným TARIC kódem"
                description="Prodejné produkty bez TARIC kódu — kód je povinný pro vývoz mimo EU a pro správné celní zařazení."
                badge={s.sec6?.total ?? 0}
                badgeColor="orange"
              >
                {s.sec6 && <Section6 data={s.sec6} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="7. Dárek není skladem"
                description="Produkt nastavený jako dárek k objednávce není momentálně skladem — zákazník dárek nedostane."
                badge={s.sec7?.total ?? 0}
                badgeColor="orange"
              >
                {s.sec7 && <Section7 data={s.sec7} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="8. Nesoulad kategorizace — strom"
                description="Stromová struktura kategorií se špatně přiřazenými produkty — produkty nesplňují pravidla kategorizace."
                badge={s.sec8?.celkem_mimo ?? 0}
                badgeColor="gray"
              >
                {s.sec8 && <Section8 data={s.sec8} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="9. Objednány k likvidaci"
                description="Produkty s blížícím se termínem likvidace — je třeba je prodat nebo zajistit jejich vyřazení před vypršením lhůty."
                badge={s.sec9?.terminy.length ?? 0}
                badgeColor="purple"
              >
                {s.sec9 && <Section9 data={s.sec9} date={report.date} reportDate={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="10. Produkty v limitu autoobjednání"
                description="Produkty, které dosahují nebo přesahují nastavený limit pro automatické objednání — vyžadují kontrolu."
                badge={s.sec10?.items.length ?? 0}
                badgeColor="purple"
              >
                {s.sec10 && <Section10 data={s.sec10} date={report.date} reportDate={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="11. Mimo saleable"
                description="Produkty, které jsou v systému aktivní, ale nesplňují podmínky pro zařazení do prodejního katalogu (saleable)."
                badge={s.sec11?.celkem_produktu ?? s.sec11?.celkem ?? 0}
                badgeColor="gray"
              >
                {s.sec11 && <Section11 data={s.sec11} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="12. Nezadané rozměry"
                description="Produkty bez vyplněných rozměrů — chybějící parametry znemožňují správný výpočet dopravy nebo zobrazení filtru."
                badge={s.sec12?.celkem_produktu ?? 0}
                badgeColor="gray"
              >
                {s.sec12 && <Section12 data={s.sec12} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="13. Saleable bez kategorie"
                description="Prodejné produkty bez přiřazené kategorie — zákazník je nenajde v navigaci ani filtrech, jsou prakticky neviditelné."
                badge={s.sec13?.total ?? s.sec13?.items.length ?? 0}
                badgeColor="blue"
              >
                {s.sec13 && <Section13 data={s.sec13} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="14. Záporná marže"
                description="Produkty, jejichž prodejní cena je nižší než nákupní — každý prodej generuje přímou ztrátu."
                badge={kpi.sec14_count}
                badgeColor="red"
              >
                {s.sec14 && <Section14 data={s.sec14} date={report.date} />}
              </CollapsibleSection>

              <CollapsibleSection
                title="15. Nesoulad kategorizace"
                description="Produkty zařazené do kategorií, které neodpovídají jejich skutečným atributům — vede k chybným filtrům a špatné zkušenosti zákazníka."
                badge={s.sec15?.celkem_mimo ?? s.sec15?.kategorie.reduce((n, k) => n + k.produktu_mimo, 0) ?? 0}
                badgeColor="gray"
              >
                {s.sec15 && <Section15 data={s.sec15} date={report.date} />}
              </CollapsibleSection>
            </div>
          </div>
        </main>
        )}
      </div>
    </div>
  )
}
