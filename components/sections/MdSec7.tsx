'use client'

import { useState } from 'react'
import { MdSec7 as MdSec7Type } from '@/types/report'

interface Props { data: MdSec7Type; date: string }

export default function MdSec7({ data }: Props) {
  const [open, setOpen] = useState<Set<number>>(new Set())

  // Sort: named persons alphabetically, unnamed at the end
  const sorted = [...data.osoby].sort((a, b) => {
    if (a.osoba === '-') return 1
    if (b.osoba === '-') return -1
    return a.osoba.localeCompare(b.osoba, 'cs')
  })

  const toggle = (i: number) =>
    setOpen((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  return (
    <div className="space-y-2">
      {sorted.map((osoba, i) => {
        const label = osoba.osoba === '-' ? '— (bez přiřazení)' : osoba.osoba
        const isOpen = open.has(i)

        return (
          <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
            <button
              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              onClick={() => toggle(i)}
            >
              <span className={`font-medium text-sm ${osoba.osoba === '-' ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                {label}
              </span>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  osoba.pocet > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}>{osoba.pocet}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-2">Unifikovaný název</th>
                      <th className="px-4 py-2">Prodejní období</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {osoba.nazvy.map((n, j) => {
                      const isNepouz = n.nazev.toUpperCase().includes('NEPOUŽÍVAT')
                      return (
                        <tr key={j} className={isNepouz ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                          <td className={`px-4 py-2 font-medium ${isNepouz ? 'text-orange-800' : ''}`}>
                            {n.nazev}
                            {isNepouz && (
                              <span className="ml-2 text-xs rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">⚠ NEPOUŽÍVAT</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 text-xs">
                            {n.obdobi.join(', ') || '—'}
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
