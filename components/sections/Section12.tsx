'use client'

import { Section12 as Section12Type } from '@/types/report'
import { useTableFilter } from '@/hooks/useTableFilter'

interface Props {
  data: Section12Type
  date: string
}

export default function Section12({ data, date }: Props) {
  const { filtered, query, setQuery } = useTableFilter(data.skupiny, ['nazev'])

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Celkem produktů</p>
          <p className="text-2xl font-bold text-gray-900">{data.celkem_produktu}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Termínů OZ</p>
          <p className="text-2xl font-bold text-gray-900">{data.pocet_terminu_oz}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtr podle skupiny..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <a
          href={`/api/reports/${date}/export?section=12`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Skupina</th>
              <th className="px-3 py-2 text-right">Počet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{item.nazev}</td>
                <td className="px-3 py-2 text-right font-semibold">{item.pocet}</td>
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
