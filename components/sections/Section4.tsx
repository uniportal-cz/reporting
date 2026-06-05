'use client'

import { useState, useRef, useMemo } from 'react'
import { Section4 as Section4Type } from '@/types/report'
import StatBars from './StatBars'

interface Props { data: Section4Type; date: string }

export default function Section4({ data, date }: Props) {
  const [query, setQuery] = useState('')
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set())
  const countryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const sortedCountries = useMemo(() =>
    Object.entries(data.countries).sort((a, b) => b[1].count - a[1].count),
    [data.countries]
  )

  const q = query.toLowerCase().trim()
  const filteredCountries = useMemo(() =>
    sortedCountries.map(([code, c]) => ({
      code,
      originalCount: c.count,
      products: q
        ? c.products.filter((p) =>
            p.id.includes(q) ||
            p.nazev.toLowerCase().includes(q) ||
            p.skupina.toLowerCase().includes(q) ||
            p.admin.toLowerCase().includes(q) ||
            p.typ.toLowerCase().includes(q)
          )
        : c.products,
    })).filter((c) => c.products.length > 0),
    [sortedCountries, q]
  )

  function toggleCountry(code: string) {
    setOpenCountries((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  function scrollToCountry(code: string) {
    const el = countryRefs.current[code]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setOpenCountries((prev) => new Set(prev).add(code))
  }

  const totalCountries = Object.keys(data.countries).length
  const hasStats = Object.keys(data.stats.byType).length > 0

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtr podle ID, názvu, skupiny, typu, admina..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <a
          href={`/api/reports/${date}/export?section=4`}
          className="flex-shrink-0 rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      {/* Stats */}
      {hasStats && (
        <div className="grid grid-cols-2 gap-6 border-b border-gray-100 pb-4">
          <StatBars title="Rozdělení dle typu" data={data.stats.byType} colorClass="bg-red-400" />
          <StatBars title="Rozdělení dle skupiny" data={data.stats.byGroup} colorClass="bg-orange-400" />
        </div>
      )}

      {/* Country chips summary */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Postiženo zemí: {totalCountries}
        </p>
        <div className="flex flex-wrap gap-2">
          {sortedCountries.map(([code, c]) => (
            <button
              key={code}
              onClick={() => scrollToCountry(code)}
              className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              <span className="font-bold">{code}</span>
              <span className="rounded-full bg-red-200 px-1.5 py-0.5 text-xs font-bold text-red-800">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Per-country collapsible sections */}
      <div className="space-y-2">
        {filteredCountries.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
        )}
        {filteredCountries.map(({ code, products, originalCount }) => {
          const isOpen = openCountries.has(code) || q.length > 0
          const isFiltered = products.length !== originalCount
          return (
            <div
              key={code}
              ref={(el) => { countryRefs.current[code] = el }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
                onClick={() => toggleCountry(code)}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-10 rounded bg-red-100 px-1.5 py-0.5 text-center text-xs font-bold text-red-700">{code}</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {products.length} produktů
                    {isFiltered && <span className="ml-1 font-normal text-gray-400">(filtrováno z {originalCount})</span>}
                  </span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-left font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Typ</th>
                        <th className="px-3 py-2">Název</th>
                        <th className="px-3 py-2">Skupina</th>
                        <th className="px-3 py-2">Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono">
                            {p.url
                              ? <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{p.id}</a>
                              : <span className="text-gray-600">{p.id}</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{p.typ}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{p.nazev}</td>
                          <td className="px-3 py-2 text-gray-600">{p.skupina}</td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">{p.admin}</span>
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
      </div>
    </div>
  )
}
