'use client'

import { useState } from 'react'
import { MdSec6 as MdSec6Type } from '@/types/report'

interface Props { data: MdSec6Type; date: string }

function categoryBg(stav: string, typ: string, splnuji: number): string {
  if (stav === 'vypnuto' && splnuji > 0) return 'bg-red-50'   // blocking
  if (stav === 'zapnuto' && typ === 'koncova' && splnuji === 0) return 'bg-orange-50' // empty active terminal
  return ''
}

function categoryBadge(stav: string, typ: string, splnuji: number): { label: string; cls: string } | null {
  if (stav === 'vypnuto' && splnuji > 0) return { label: 'Blokuje produkty', cls: 'bg-red-100 text-red-700' }
  if (stav === 'zapnuto' && typ === 'koncova' && splnuji === 0) return { label: 'Prázdná aktivní', cls: 'bg-orange-100 text-orange-700' }
  return null
}

export default function MdSec6({ data }: Props) {
  const [openStromy, setOpenStromy] = useState<Set<number>>(new Set([0]))

  const toggle = (i: number) =>
    setOpenStromy((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-sm text-gray-600 mb-3">
        <span>Celkem kategorií: <span className="font-bold text-gray-900">{data.total}</span></span>
        <span className="text-red-600">
          Problemových:{' '}
          <span className="font-bold">
            {data.stromy.reduce((s, st) =>
              s + st.kategorie.filter((k) => categoryBadge(k.stav, k.typ, k.splnuji) !== null).length, 0
            )}
          </span>
        </span>
      </div>

      {data.stromy.map((strom, i) => {
        const isOpen = openStromy.has(i)
        const problematic = strom.kategorie.filter((k) => categoryBadge(k.stav, k.typ, k.splnuji) !== null).length

        return (
          <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
            <button
              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              onClick={() => toggle(i)}
            >
              <span className="font-medium text-sm text-gray-800">
                {strom.url ? (
                  <a href={strom.url} target="_blank" rel="noreferrer"
                    className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                    {strom.nazev}
                  </a>
                ) : strom.nazev}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{strom.kategorie.length} kat.</span>
                {problematic > 0 && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {problematic} problémových
                  </span>
                )}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && strom.kategorie.length > 0 && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2">Kategorie</th>
                      <th className="px-3 py-2">Typ</th>
                      <th className="px-3 py-2">Stav</th>
                      <th className="px-3 py-2 text-right">Splňují / Celkem</th>
                      <th className="px-3 py-2">Problém</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {strom.kategorie.map((kat, j) => {
                      const badge = categoryBadge(kat.stav, kat.typ, kat.splnuji)
                      return (
                        <tr key={j} className={`${categoryBg(kat.stav, kat.typ, kat.splnuji)} hover:bg-gray-50`}>
                          <td className="px-3 py-2 font-medium text-xs">
                            {kat.url ? (
                              <a href={kat.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                {kat.nazev}
                              </a>
                            ) : kat.nazev}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">{kat.typ}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              kat.stav === 'zapnuto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>{kat.stav}</span>
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-gray-700">
                            {kat.splnuji} / {kat.celkem}
                          </td>
                          <td className="px-3 py-2">
                            {badge && (
                              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                            )}
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
