'use client'

import { Section11 as Section11Type } from '@/types/report'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTableFilter } from '@/hooks/useTableFilter'
import StatBars from './StatBars'

interface Props {
  data: Section11Type
  date: string
}

export default function Section11({ data, date }: Props) {
  const { filtered, query, setQuery } = useTableFilter(data.items, ['skupina_nazev', 'admin'])

  const chartData = data.items
    .slice()
    .sort((a, b) => b.pocet - a.pocet)
    .slice(0, 20)
    .map((i) => ({
      name: i.skupina_nazev.length > 20 ? i.skupina_nazev.slice(0, 20) + '…' : i.skupina_nazev,
      pocet: i.pocet,
    }))

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Skupin</p>
          <p className="text-2xl font-bold text-gray-900">{data.celkem}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Celkem produktů</p>
          <p className="text-2xl font-bold text-gray-900">{data.celkem_produktu}</p>
        </div>
      </div>

      {Object.keys(data.byAdmin).length > 0 && (
        <div className="mb-6">
          <StatBars data={data.byAdmin} title="Produktů mimo saleable dle admina" />
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="pocet" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs text-gray-400">Top 20 skupin</p>
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtr podle skupiny, admina..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <a
          href={`/api/reports/${date}/export?section=11`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Skupina ID</th>
              <th className="px-3 py-2">Skupina</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2 text-right">Počet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.skupina_id}</td>
                <td className="px-3 py-2 font-medium">{item.skupina_nazev}</td>
                <td className="px-3 py-2 text-gray-600">{item.admin}</td>
                <td className="px-3 py-2 text-right font-semibold">{item.pocet}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={3} className="px-3 py-2 font-semibold">Skupin celkem / produktů celkem</td>
              <td className="px-3 py-2 text-right font-bold">{data.celkem} / {data.celkem_produktu}</td>
            </tr>
          </tfoot>
        </table>
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
        )}
      </div>
    </div>
  )
}
