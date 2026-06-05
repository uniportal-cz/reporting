'use client'

import { Section6 as Section6Type } from '@/types/report'

interface Props {
  data: Section6Type
  date: string
}

export default function Section6({ data, date }: Props) {
  const sorted = [...data.items].sort((a, b) => b.pocet - a.pocet)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Celkem produktů: <span className="font-bold text-gray-900">{data.total}</span>
        </p>
        <a
          href={`/api/reports/${date}/export?section=6`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">UN kód</th>
              <th className="px-3 py-2 text-right">Počet produktů</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs font-medium">{item.un_kod}</td>
                <td className="px-3 py-2 text-right font-semibold">{item.pocet}</td>
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
