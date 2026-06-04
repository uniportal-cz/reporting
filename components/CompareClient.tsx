'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Report } from '@/types/report'
import { REPORT_TYPES } from '@/lib/report-types'
import { format, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'

interface Props {
  reports: Report[]
  allDates: string[]
  selectedDates: string[]
  activeType: string
}

const KPI_DEFS = [
  { key: 'sec1_count', label: 'Doprodej bez zásoby', color: 'orange', better: 'low' },
  { key: 'sec4_count', label: 'Nelze doručit', color: 'red', better: 'low' },
  { key: 'sec14_count', label: 'Záporná marže', color: 'red', better: 'low' },
  { key: 'sec13_count', label: 'Bez kategorie', color: 'blue', better: 'low' },
  { key: 'sec9_terms', label: 'Likvidace – termínů', color: 'purple', better: 'low' },
] as const

type KpiKey = typeof KPI_DEFS[number]['key']

function fmtDate(d: string) {
  try { return format(parseISO(d), 'EEE d.M.', { locale: cs }) } catch { return d }
}

function delta(curr: number, prev: number): { val: number; cls: string; sym: string } | null {
  if (prev === 0 && curr === 0) return null
  const diff = curr - prev
  if (diff === 0) return { val: 0, cls: 'text-gray-400', sym: '=' }
  // lower is better → green when going down
  const cls = diff < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
  return { val: Math.abs(diff), cls, sym: diff < 0 ? `−${Math.abs(diff)}` : `+${diff}` }
}

export default function CompareClient({ reports, allDates, selectedDates, activeType }: Props) {
  const router = useRouter()
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedDates))

  const sorted = [...reports].sort((a, b) => a.date < b.date ? -1 : 1)

  function applySelection(next: Set<string>) {
    setPicked(next)
    const dates = [...next].sort().join(',')
    router.push(`/dashboard/compare?type=${activeType}&dates=${dates}`)
  }

  function toggleDate(d: string) {
    const next = new Set(picked)
    if (next.has(d)) { next.delete(d) } else { next.add(d) }
    applySelection(next)
  }

  function selectLast(n: number) {
    applySelection(new Set(allDates.slice(0, n)))
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">

      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard?type=${activeType}`)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zpět
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="font-bold text-gray-900 text-sm">Srovnání reportů</h1>
          </div>
          <div className="flex items-center gap-2">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/dashboard/compare?type=${t.id}`)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  activeType === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Date selector sidebar */}
        <aside className="w-44 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="border-b border-gray-100 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reporty</p>
          </div>
          {/* Quick selects */}
          <div className="flex gap-1 px-3 py-2 border-b border-gray-100">
            {[3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => selectLast(n)}
                className="flex-1 rounded bg-gray-100 px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {n}d
              </button>
            ))}
          </div>
          <nav className="flex-1 overflow-y-auto">
            {allDates.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">Žádné reporty v DB</p>
            ) : (
              <ul>
                {allDates.map((d) => (
                  <li key={d}>
                    <button
                      onClick={() => toggleDate(d)}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50 transition-colors flex items-center justify-between ${
                        picked.has(d) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{fmtDate(d)}</span>
                      {picked.has(d) && (
                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        {/* Main compare area */}
        <main className="flex-1 overflow-auto p-5">
          {sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-gray-400">
              <div>
                <svg className="mx-auto w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-medium text-gray-500">Vyber reporty vlevo</p>
                <p className="text-xs mt-1">nebo klikni 3d / 5d / 10d</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">

              {/* KPI comparison table */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-800 text-sm">KPI přehled</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-44">Metrika</th>
                        {sorted.map((r, i) => (
                          <th key={r.date} className="px-4 py-2.5 text-center text-xs font-medium text-gray-600 min-w-[90px]">
                            {fmtDate(r.date)}
                            {i > 0 && <div className="text-gray-400 font-normal">vs. předchozí</div>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {KPI_DEFS.map(({ key, label, color }) => (
                        <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-xs font-medium text-gray-700">{label}</td>
                          {sorted.map((r, i) => {
                            const val = r.kpi[key as KpiKey]
                            const prev = i > 0 ? sorted[i - 1].kpi[key as KpiKey] : null
                            const d = prev !== null ? delta(val, prev) : null
                            const colorCls = {
                              red: 'text-red-700',
                              orange: 'text-orange-700',
                              blue: 'text-blue-700',
                              purple: 'text-purple-700',
                            }[color]
                            return (
                              <td key={r.date} className="px-4 py-3 text-center">
                                <span className={`text-base font-bold ${colorCls}`}>{val}</span>
                                {d && (
                                  <span className={`ml-1.5 text-xs ${d.cls}`}>({d.sym})</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-section detail comparison */}
              {(['sec1', 'sec13', 'sec14'] as const).map((secKey) => {
                const hasAny = sorted.some((r) => r.sections[secKey])
                if (!hasAny) return null

                const secLabel: Record<string, string> = {
                  sec1: '1. Doprodej bez zásoby — produkty',
                  sec13: '13. Bez kategorie — produkty',
                  sec14: '14. Záporná marže — produkty',
                }

                // Collect all product codes across all reports
                const allCodes = new Set<string>()
                sorted.forEach((r) => {
                  const sec = r.sections[secKey]
                  if (!sec) return
                  if (secKey === 'sec1') (sec as any).items?.forEach((p: any) => allCodes.add(p.id || p.kod || ''))
                  if (secKey === 'sec13') (sec as any).items?.forEach((p: any) => allCodes.add(p.kod || ''))
                  if (secKey === 'sec14') (sec as any).skupiny?.forEach((s: any) => s.produkty?.forEach((p: any) => allCodes.add(p.kod || '')))
                })

                if (allCodes.size === 0) return null

                return (
                  <div key={secKey} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="font-semibold text-gray-800 text-sm">{secLabel[secKey]}</h2>
                      <span className="text-xs text-gray-400">{allCodes.size} unikátních produktů</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="px-4 py-2 text-left font-medium text-gray-500 w-28">Kód</th>
                            {sorted.map((r) => (
                              <th key={r.date} className="px-4 py-2 text-center font-medium text-gray-500">{fmtDate(r.date)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...allCodes].filter(Boolean).sort().slice(0, 100).map((code) => {
                            const presence = sorted.map((r) => {
                              const sec = r.sections[secKey]
                              if (!sec) return false
                              if (secKey === 'sec1') return (sec as any).items?.some((p: any) => (p.id || p.kod) === code)
                              if (secKey === 'sec13') return (sec as any).items?.some((p: any) => p.kod === code)
                              if (secKey === 'sec14') return (sec as any).skupiny?.some((s: any) => s.produkty?.some((p: any) => p.kod === code))
                              return false
                            })
                            const presentCount = presence.filter(Boolean).length
                            const alwaysPresent = presentCount === sorted.length
                            return (
                              <tr key={code} className={`border-b border-gray-50 ${alwaysPresent ? 'bg-red-50/40' : ''}`}>
                                <td className="px-4 py-1.5 font-mono text-gray-700">{code}</td>
                                {presence.map((p, i) => (
                                  <td key={i} className="px-4 py-1.5 text-center">
                                    {p
                                      ? <span className="inline-block w-4 h-4 rounded-full bg-red-400" title="Přítomen" />
                                      : <span className="inline-block w-4 h-4 rounded-full bg-gray-100" title="Chybí" />
                                    }
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                          {allCodes.size > 100 && (
                            <tr><td colSpan={sorted.length + 1} className="px-4 py-2 text-xs text-gray-400">… a dalších {allCodes.size - 100} produktů</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
