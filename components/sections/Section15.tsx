'use client'

import { useMemo } from 'react'
import { Section15 as Section15Type } from '@/types/report'

interface Props {
  data: Section15Type
  date: string
}

export default function Section15({ data, date }: Props) {
  const sorted = useMemo(
    () => [...data.kategorie].sort((a, b) => b.produktu_mimo - a.produktu_mimo),
    [data.kategorie]
  )

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a
          href={`/api/reports/${date}/export?section=15`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Kategorie</th>
              <th className="px-3 py-2 text-right">Pravidel</th>
              <th className="px-3 py-2 text-right">Produktů mimo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{item.nazev}</td>
                <td className="px-3 py-2 text-right text-gray-600">{item.pocet_pravidel}</td>
                <td className="px-3 py-2 text-right">
                  <span className={`font-semibold ${item.produktu_mimo > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                    {item.produktu_mimo}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
        )}
      </div>
    </div>
  )
}
