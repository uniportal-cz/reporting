'use client'

import { useMemo, useState } from 'react'
import { Section4 as Section4Type } from '@/types/report'

interface Props {
  data: Section4Type
  date: string
}

export default function Section4({ data, date }: Props) {
  const [query, setQuery] = useState('')

  // Build a map: productId -> { product info, countries }
  const { allCountries, productRows } = useMemo(() => {
    const countries = new Set<string>()
    const productMap = new Map<string, {
      id: string; typ: string; nazev: string; skupina: string; admin: string
      countries: Set<string>
    }>()

    for (const z of data.zeme) {
      countries.add(z.zeme)
      for (const p of z.produkty) {
        const key = p.id || p.nazev
        if (!productMap.has(key)) {
          productMap.set(key, { ...p, countries: new Set() })
        }
        productMap.get(key)!.countries.add(z.zeme)
      }
    }

    return {
      allCountries: Array.from(countries).sort(),
      productRows: Array.from(productMap.values()),
    }
  }, [data])

  const filtered = useMemo(() => {
    if (!query.trim()) return productRows
    const q = query.toLowerCase()
    return productRows.filter(
      (p) =>
        p.nazev.toLowerCase().includes(q) ||
        p.skupina.toLowerCase().includes(q) ||
        p.admin.toLowerCase().includes(q)
    )
  }, [productRows, query])

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtr podle názvu, skupiny, admina..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <a
          href={`/api/reports/${date}/export?section=4`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Typ</th>
              <th className="px-3 py-2">Název</th>
              <th className="px-3 py-2">Skupina</th>
              <th className="px-3 py-2">Admin</th>
              {allCountries.map((z) => (
                <th key={z} className="px-3 py-2 text-center">{z}</th>
              ))}
              <th className="px-3 py-2 text-center">Celkem zemí</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p, i) => {
              const countryCount = p.countries.size
              const isMulti = countryCount > 1
              return (
                <tr
                  key={i}
                  className={`hover:bg-gray-50 ${isMulti ? 'bg-yellow-50 font-semibold' : ''}`}
                >
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.id}</td>
                  <td className="px-3 py-2 text-gray-600">{p.typ}</td>
                  <td className="px-3 py-2">{p.nazev}</td>
                  <td className="px-3 py-2 text-gray-600">{p.skupina}</td>
                  <td className="px-3 py-2 text-gray-600">{p.admin}</td>
                  {allCountries.map((z) => (
                    <td key={z} className="px-3 py-2 text-center">
                      {p.countries.has(z) ? (
                        <span className="text-red-500">✗</span>
                      ) : (
                        <span className="text-green-500">✓</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${isMulti ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {countryCount}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
        )}
      </div>
    </div>
  )
}
