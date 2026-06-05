'use client'

import { useState, useMemo, useRef } from 'react'
import { Section4 as Section4Type, Section4Product } from '@/types/report'
import StatBars from './StatBars'

const ALPHA3_TO_ALPHA2: Record<string, string> = {
  AUT: 'AT', BEL: 'BE', BGR: 'BG', CYP: 'CY', CZE: 'CZ',
  DEU: 'DE', DNK: 'DK', ESP: 'ES', EST: 'EE', FIN: 'FI',
  FRA: 'FR', GBR: 'GB', GRC: 'GR', HRV: 'HR', HUN: 'HU',
  IRL: 'IE', ITA: 'IT', LTU: 'LT', LUX: 'LU', LVA: 'LV',
  MLT: 'MT', NLD: 'NL', NOR: 'NO', POL: 'PL', PRT: 'PT',
  ROU: 'RO', SVK: 'SK', SVN: 'SI', SWE: 'SE', CHE: 'CH',
  USA: 'US', CAN: 'CA', AUS: 'AU', JPN: 'JP',
}

function countryEmoji(code: string): string {
  const alpha2 = code.length === 2 ? code : (ALPHA3_TO_ALPHA2[code] ?? '')
  if (!alpha2) return ''
  return alpha2.split('').map((c) => String.fromCodePoint(c.charCodeAt(0) + 0x1F1A5)).join('')
}

interface Props { data: Section4Type; date: string }

export default function Section4({ data, date }: Props) {
  // Detect old-format data (stored before this rewrite)
  const products = (data as any).products as Section4Product[] | undefined
  const countryCounts = (data as any).countryCounts as Record<string, number> | undefined

  const allCountries = useMemo(
    () => Object.keys(countryCounts ?? {}).sort((a, b) => (countryCounts![b] ?? 0) - (countryCounts![a] ?? 0)),
    [countryCounts]
  )

  const countryKey = allCountries.join(',')
  const prevCountryKeyRef = useRef(countryKey)
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => new Set(allCountries))

  // Sync selection when different report is loaded
  if (prevCountryKeyRef.current !== countryKey) {
    prevCountryKeyRef.current = countryKey
    setSelectedCountries(new Set(allCountries))
  }

  const [query, setQuery] = useState('')
  const q = query.toLowerCase().trim()

  const filteredProducts = useMemo(() => {
    const ps = products ?? []
    return ps.filter((p) => {
      const inCountry = selectedCountries.size === 0 || p.countries.some((c) => selectedCountries.has(c))
      if (!inCountry) return false
      if (!q) return true
      return (
        p.id.includes(q) ||
        p.nazev.toLowerCase().includes(q) ||
        p.skupina.toLowerCase().includes(q) ||
        p.admin.toLowerCase().includes(q) ||
        p.typ.toLowerCase().includes(q)
      )
    })
  }, [products, selectedCountries, q])

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  if (!products || !countryCounts) {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Report je ve starém formátu. Znovu jej načti z emailu pro aktualizaci vizualizace.
      </div>
    )
  }

  const allSelected = selectedCountries.size === allCountries.length
  const hasStats = Object.keys(data.stats?.byType ?? {}).length > 0

  return (
    <div className="space-y-5">

      {/* Stats */}
      {hasStats && (
        <div className="grid grid-cols-2 gap-6 border-b border-gray-100 pb-4">
          <StatBars title="Rozdělení dle typu" data={data.stats.byType} colorClass="bg-red-400" />
          <StatBars title="Rozdělení dle skupiny" data={data.stats.byGroup} colorClass="bg-orange-400" />
        </div>
      )}

      {/* Country chip-list */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Postiženo zemí: {allCountries.length}
          </p>
          {!allSelected && (
            <button
              onClick={() => setSelectedCountries(new Set(allCountries))}
              className="text-xs text-blue-600 hover:underline"
            >
              Vybrat vše
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allCountries.map((code) => {
            const isSelected = selectedCountries.has(code)
            const flag = countryEmoji(code)
            return (
              <button
                key={code}
                onClick={() => toggleCountry(code)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                }`}
              >
                {flag && <span className="text-sm leading-none">{flag}</span>}
                <span className="font-bold">{code}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  isSelected ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-400'
                }`}>{countryCounts[code]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search + meta */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtr podle ID, názvu, skupiny, typu, admina..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(q || !allSelected) && (
          <span className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {filteredProducts.length} z {data.totalUnique}
          </span>
        )}
        <a
          href={`/api/reports/${date}/export?section=4`}
          className="flex-shrink-0 rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Typ</th>
              <th className="px-3 py-2 text-left">Název</th>
              <th className="px-3 py-2 text-left">Skupina</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-left">Země</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">
                  {p.url
                    ? <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{p.id}</a>
                    : <span className="text-gray-600">{p.id}</span>}
                </td>
                <td className="px-3 py-2 text-gray-600">{p.typ}</td>
                <td className="px-3 py-2 font-medium">{p.nazev}</td>
                <td className="px-3 py-2 text-gray-600">{p.skupina}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{p.admin}</span>
                </td>
                <td className="px-3 py-2 text-base leading-none">
                  {p.countries.map((c) => countryEmoji(c) || c).join(' ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            {selectedCountries.size === 0 ? 'Vyberte alespoň jednu zemi' : 'Žádné výsledky'}
          </p>
        )}
      </div>
    </div>
  )
}
