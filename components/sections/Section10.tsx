'use client'

import { useMemo, useState } from 'react'
import { Section10 as Section10Type } from '@/types/report'
import { parseISO, isValid, startOfMonth, addMonths, isBefore } from 'date-fns'

interface Props {
  data: Section10Type
  date: string
  reportDate: string
}

function parseTermin(s: string): Date | null {
  if (!s) return null
  const formats = [s, s.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1')]
  for (const f of formats) {
    const d = parseISO(f)
    if (isValid(d)) return d
  }
  return null
}

function terminColor(termin: string, refDate: Date): string {
  const d = parseTermin(termin)
  if (!d) return 'text-gray-500'
  const thisMonthEnd = startOfMonth(addMonths(refDate, 1))
  const nextMonthEnd = startOfMonth(addMonths(refDate, 2))
  if (isBefore(d, thisMonthEnd)) return 'text-red-600 font-semibold'
  if (isBefore(d, nextMonthEnd)) return 'text-orange-500 font-semibold'
  return 'text-gray-500'
}

export default function Section10({ data, date, reportDate }: Props) {
  const [query, setQuery] = useState('')

  const refDate = parseISO(reportDate)
  const validRefDate = isValid(refDate) ? refDate : new Date()

  const sorted = useMemo(() => {
    return [...data.items].sort((a, b) => {
      const da = parseTermin(a.termin)
      const db = parseTermin(b.termin)
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return da.getTime() - db.getTime()
    })
  }, [data.items])

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted
    const q = query.toLowerCase()
    return sorted.filter(
      (i) =>
        i.nazev.toLowerCase().includes(q) ||
        i.dodavatel.toLowerCase().includes(q) ||
        i.admin.toLowerCase().includes(q) ||
        i.skupina.toLowerCase().includes(q)
    )
  }, [sorted, query])

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-red-400" /> tento měsíc
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-orange-400" /> příští měsíc
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-gray-400" /> vzdálenější
          </span>
        </div>
        <input
          type="text"
          placeholder="Filtr..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <a
          href={`/api/reports/${date}/export?section=10`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Termín</th>
              <th className="px-3 py-2">Dodavatel</th>
              <th className="px-3 py-2">Kód</th>
              <th className="px-3 py-2">Název</th>
              <th className="px-3 py-2">Skupina</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2 text-right">Ks</th>
              <th className="px-3 py-2">OZ</th>
              <th className="px-3 py-2">Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className={`px-3 py-2 font-mono text-xs ${terminColor(item.termin, validRefDate)}`}>
                  {item.termin}
                </td>
                <td className="px-3 py-2 text-gray-600">{item.dodavatel}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.kod}</td>
                <td className="px-3 py-2 font-medium">{item.nazev}</td>
                <td className="px-3 py-2 text-gray-600">{item.skupina}</td>
                <td className="px-3 py-2 text-gray-600">{item.admin}</td>
                <td className="px-3 py-2 text-right">{item.ks}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.oz_cislo}</td>
                <td className="px-3 py-2 text-gray-600">{item.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
        )}
      </div>
    </div>
  )
}
