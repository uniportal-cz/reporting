'use client'

import { useState } from 'react'
import { Section8 as Section8Type } from '@/types/report'

interface Props {
  data: Section8Type
  date: string
}

export default function Section8({ data, date }: Props) {
  const [openStromy, setOpenStromy] = useState<Set<number>>(new Set([0]))

  const toggle = (i: number) =>
    setOpenStromy((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-600">
          <span>Kategorií: <span className="font-bold text-gray-900">{data.celkem_kategorii}</span></span>
          <span>Produktů mimo: <span className="font-bold text-orange-600">{data.celkem_mimo}</span></span>
        </div>
        <a
          href={`/api/reports/${date}/export?section=8`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="space-y-2">
        {data.stromy.map((strom, i) => {
          const open = openStromy.has(i)
          const strom_mimo = strom.kategorie.reduce((s, k) => s + k.produktu_mimo, 0)
          return (
            <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
              <button
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                onClick={() => toggle(i)}
              >
                <span className="font-medium text-sm text-gray-800">{strom.nazev}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{strom.kategorie.length} kategorie</span>
                  {strom_mimo > 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      {strom_mimo} mimo
                    </span>
                  )}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {open && strom.kategorie.length > 0 && (
                <div className="border-t border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-2">Kategorie</th>
                        <th className="px-4 py-2 text-right">Pravidel</th>
                        <th className="px-4 py-2 text-right">Produktů mimo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...strom.kategorie].sort((a, b) => b.produktu_mimo - a.produktu_mimo).map((kat, j) => (
                        <tr key={j} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{kat.nazev}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{kat.pocet_pravidel}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`font-semibold ${kat.produktu_mimo > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                              {kat.produktu_mimo}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
        {data.stromy.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné kategorie</p>
        )}
      </div>
    </div>
  )
}
