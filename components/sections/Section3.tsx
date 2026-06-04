'use client'

import { Section3 as Section3Type } from '@/types/report'
import { useTableFilter } from '@/hooks/useTableFilter'

interface Props {
  data: Section3Type
  date: string
}

export default function Section3({ data, date }: Props) {
  const { filtered, query, setQuery } = useTableFilter(data.items, ['nazev', 'skupina', 'admin'])

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
          href={`/api/reports/${date}/export?section=3`}
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
              <th className="px-3 py-2">Název</th>
              <th className="px-3 py-2">Ceník</th>
              <th className="px-3 py-2">Skupina</th>
              <th className="px-3 py-2">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.id}</td>
                <td className="px-3 py-2 font-medium">{item.nazev}</td>
                <td className="px-3 py-2 text-gray-600">{item.cenik}</td>
                <td className="px-3 py-2 text-gray-600">{item.skupina}</td>
                <td className="px-3 py-2 text-gray-600">{item.admin}</td>
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
