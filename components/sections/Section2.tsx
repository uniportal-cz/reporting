'use client'

import { Section2 as Section2Type } from '@/types/report'
import { useTableFilter } from '@/hooks/useTableFilter'
import { useTableSort } from '@/hooks/useTableSort'
import StatBars from './StatBars'

type Item = Section2Type['sample'][number]

interface Props { data: Section2Type; date: string }

function SortTh({ col, label, sortKey, sortDir, onSort }: { col: keyof Item; label: string; sortKey: keyof Item | null; sortDir: 'asc'|'desc'; onSort: (k: keyof Item) => void }) {
  const active = sortKey === col
  return (
    <th className="cursor-pointer select-none px-3 py-2 hover:bg-gray-100 text-left" onClick={() => onSort(col)}>
      <span className="flex items-center gap-1">
        {label}
        <span className="text-gray-400 text-xs">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </span>
    </th>
  )
}

export default function Section2({ data, date }: Props) {
  const { filtered, query, setQuery } = useTableFilter(data.sample, ['dodavatel', 'kod', 'nazev', 'skupina', 'admin'])
  const { sorted, sortKey, sortDir, toggleSort } = useTableSort(filtered)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtr podle dodavatele, kódu, názvu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <a href={`/api/reports/${date}/export?section=2`} className="flex-shrink-0 rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <SortTh col="dodavatel" label="Dodavatel" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="kod" label="Kód" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="nazev" label="Název" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="skupina" label="Skupina" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="admin" label="Admin" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="skladem" label="Skladem" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600">{item.dodavatel}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.kod}</td>
                <td className="px-3 py-2 font-medium">{item.nazev}</td>
                <td className="px-3 py-2 text-gray-600">{item.skupina}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{item.admin}</span>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">{item.skladem}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>}
      </div>

      {data.sample.length > 0 && (
        <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-4">
          <StatBars title="Rozdělení dle dodavatele" data={data.stats.byDodavatel} colorClass="bg-blue-400" />
          <StatBars title="Rozdělení dle skupiny" data={data.stats.byGroup} colorClass="bg-orange-400" />
        </div>
      )}
    </div>
  )
}
