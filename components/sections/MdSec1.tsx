'use client'

import { useState } from 'react'
import { MdSec1 as MdSec1Type } from '@/types/report'

interface Props { data: MdSec1Type; date: string }

const KANAL_LABELS: Record<string, string> = {
  googleMerchantCenter: 'Google Merchant Center',
  heureka: 'Heureka',
  idealo: 'Idealo',
  alzaMarketplace: 'Alza Marketplace',
  heurekaCart: 'Heureka Košík',
}

function chybovostColor(pct: number): string {
  if (pct < 5) return 'bg-green-100 text-green-800'
  if (pct <= 20) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export default function MdSec1({ data }: Props) {
  const [openKanaly, setOpenKanaly] = useState<Set<number>>(new Set([0]))

  const toggle = (i: number) =>
    setOpenKanaly((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  const total = data.ok_total + data.chybovych_total
  const celkPct = total > 0 ? Math.round((data.chybovych_total / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Overall progress summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-gray-600">Celkem v pořádku: <span className="font-semibold text-green-700">{data.ok_total.toLocaleString()}</span></span>
          <span className="text-gray-600">Chybových: <span className="font-semibold text-red-700">{data.chybovych_total.toLocaleString()}</span></span>
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${chybovostColor(celkPct)}`}>{celkPct} %</span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-3 rounded-full bg-green-500"
            style={{ width: `${total > 0 ? Math.round((data.ok_total / total) * 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>OK</span>
          <span>Chybové</span>
        </div>
      </div>

      {/* Per-channel collapsibles */}
      {data.kanaly.map((kanal, i) => {
        const isOpen = openKanaly.has(i)
        const label = KANAL_LABELS[kanal.kanal] ?? kanal.kanal
        const sorted = [...kanal.masky].sort((a, b) => b.chybovych - a.chybovych)

        return (
          <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
            <button
              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              onClick={() => toggle(i)}
            >
              <span className="font-medium text-sm text-gray-800">{label}</span>
              <div className="flex items-center gap-3">
                {kanal.chybovych_total > 0 && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {kanal.chybovych_total.toLocaleString()} chybových
                  </span>
                )}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2">Šablona</th>
                      <th className="px-3 py-2">Název masky</th>
                      <th className="px-3 py-2">Typ produktu</th>
                      <th className="px-3 py-2">Požadované vlastnosti</th>
                      <th className="px-3 py-2 text-right">OK</th>
                      <th className="px-3 py-2 text-right">Chybových</th>
                      <th className="px-3 py-2 text-right">Chybovost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((maska, j) => {
                      const tot = maska.ok + maska.chybovych
                      const pct = tot > 0 ? Math.round((maska.chybovych / tot) * 100) : 0
                      return (
                        <tr key={j} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs">
                            {maska.sablona_url ? (
                              <a href={maska.sablona_url} target="_blank" rel="noreferrer"
                                className="text-blue-600 hover:underline max-w-[160px] block truncate" title={maska.sablona}>
                                {maska.sablona}
                              </a>
                            ) : (
                              <span className="max-w-[160px] block truncate" title={maska.sablona}>{maska.sablona}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-xs">{maska.nazev_masky}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{maska.typ_produktu}</td>
                          <td className="px-3 py-2 text-xs text-gray-500 max-w-[180px]">
                            {maska.vlastnosti.join(', ')}
                          </td>
                          <td className="px-3 py-2 text-right text-green-700 font-medium">{maska.ok.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-700">{maska.chybovych.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${chybovostColor(pct)}`}>
                              {pct} %
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
