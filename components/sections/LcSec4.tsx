'use client'

import { useState, useMemo } from 'react'
import { LcSec4 as LcSec4Type, LcSec4TextValues } from '@/types/report'

interface Props { data: LcSec4Type; date: string }

type SubsectionKey = keyof LcSec4Type['subsections']

const SUBSECTION_LABELS: { key: SubsectionKey; label: string }[] = [
  { key: 'nazev', label: 'Název' },
  { key: 'kratkypopis', label: 'Krátký popis' },
  { key: 'detailnipopis', label: 'Detailní popis' },
]

const FLAG: Record<string, string> = {
  CS: '🇨🇿', SK: '🇸🇰', DE: '🇩🇪', EN: '🇬🇧', FR: '🇫🇷', IT: '🇮🇹',
  ES: '🇪🇸', PL: '🇵🇱', HU: '🇭🇺', RO: '🇷🇴', SL: '🇸🇮', LV: '🇱🇻',
  NL: '🇳🇱', DA: '🇩🇰',
}

function genPct(tv: LcSec4TextValues): number {
  const total = tv.generated + tv.missing + tv.manual + tv.machine + tv.api
  if (total === 0) return -1
  return Math.round((tv.generated / total) * 100)
}

function cellColor(pct: number): string {
  if (pct < 0) return 'bg-gray-50 text-gray-300'
  if (pct >= 95) return 'bg-green-100 text-green-800'
  if (pct >= 70) return 'bg-yellow-50 text-yellow-800'
  if (pct >= 30) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-700'
}

export default function LcSec4({ data }: Props) {
  const [activeTab, setActiveTab] = useState<SubsectionKey>('nazev')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const sub = data.subsections[activeTab]
  const langs = data.languageOrder.length > 0 ? data.languageOrder : sub.languageOrder

  const catTotals = useMemo(() => {
    return sub.categories.map((cat) => {
      let total = 0
      let generated = 0
      for (const tv of Object.values(cat.languages)) {
        total += tv.generated + tv.missing + tv.manual + tv.machine + tv.api
        generated += tv.generated
      }
      return { pct: total > 0 ? Math.round((generated / total) * 100) : -1, total, generated }
    })
  }, [sub])

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {SUBSECTION_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setExpandedCat(null) }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {data.generatedAt && (
        <p className="text-xs text-gray-400">
          Vygenerováno: {data.generatedAt.replace('T', ' ').slice(0, 16)}
        </p>
      )}

      {/* Matrix */}
      {sub.categories.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Žádná data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">Kategorie</th>
                <th className="px-3 py-2 text-left">Odpovědná osoba</th>
                <th className="px-3 py-2 text-center">Celkem</th>
                {langs.map((lang) => (
                  <th key={lang} className="px-2 py-2 text-center min-w-[3.5rem]">
                    {FLAG[lang] ?? lang}<br />
                    <span className="text-xs normal-case font-normal">{lang}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sub.categories.map((cat, i) => {
                const { pct } = catTotals[i]
                const isExpanded = expandedCat === cat.id
                const catName = cat.id.includes('|') ? cat.id.split('|').slice(1).join('|').trim() : cat.id

                return (
                  <>
                    <tr
                      key={cat.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                    >
                      <td className="px-3 py-2 font-medium sticky left-0 bg-white">
                        <span className="text-gray-400 mr-1">{isExpanded ? '▾' : '▸'}</span>
                        {catName}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{cat.person}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${cellColor(pct)}`}>
                        {pct >= 0 ? `${pct}%` : '—'}
                      </td>
                      {langs.map((lang) => {
                        const tv = cat.languages[lang]
                        const p = tv ? genPct(tv) : -1
                        return (
                          <td key={lang} className={`px-2 py-2 text-center ${cellColor(p)}`}>
                            {p >= 0 ? `${p}%` : '—'}
                          </td>
                        )
                      })}
                    </tr>
                    {isExpanded && (
                      <tr key={`${cat.id}-exp`} className="bg-gray-50">
                        <td colSpan={langs.length + 3} className="px-3 py-3">
                          <div className="overflow-x-auto">
                            <table className="text-xs min-w-full">
                              <thead>
                                <tr className="text-gray-500 uppercase tracking-wider">
                                  <th className="pr-4 py-1 text-left">Jazyk</th>
                                  <th className="px-2 py-1 text-right">Vygenerováno</th>
                                  <th className="px-2 py-1 text-right">Chybí</th>
                                  <th className="px-2 py-1 text-right">Manuální</th>
                                  <th className="px-2 py-1 text-right">Strojový</th>
                                  <th className="px-2 py-1 text-right">API</th>
                                </tr>
                              </thead>
                              <tbody>
                                {langs.map((lang) => {
                                  const tv = cat.languages[lang]
                                  if (!tv) return null
                                  return (
                                    <tr key={lang} className="border-t border-gray-200">
                                      <td className="pr-4 py-1 font-medium">{FLAG[lang] ?? lang} {lang}</td>
                                      <td className="px-2 py-1 text-right text-green-700">{tv.generated}</td>
                                      <td className={`px-2 py-1 text-right ${tv.missing > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>{tv.missing}</td>
                                      <td className="px-2 py-1 text-right text-blue-600">{tv.manual}</td>
                                      <td className="px-2 py-1 text-right text-purple-600">{tv.machine}</td>
                                      <td className="px-2 py-1 text-right text-orange-600">{tv.api}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> ≥95%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 inline-block" /> 70–94%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" /> 30–69%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> &lt;30%</span>
      </div>
    </div>
  )
}
