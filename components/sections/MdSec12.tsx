'use client'

import { MdSec12 as MdSec12Type } from '@/types/report'

interface Props { data: MdSec12Type; date: string }

export default function MdSec12({ data }: Props) {
  const sorted = [...data.items].sort((a, b) => {
    const g = a.skupina_id.localeCompare(b.skupina_id, 'cs')
    return g !== 0 ? g : a.nazev.localeCompare(b.nazev, 'cs')
  })

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a
          href={`/api/reports/export?section=md12`}
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
              <th className="px-3 py-2">Stav</th>
              <th className="px-3 py-2">Skupina</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">
                  {item.id_url ? (
                    <a href={item.id_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {item.id}
                    </a>
                  ) : item.id}
                </td>
                <td className="px-3 py-2 font-medium">{item.nazev}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    item.stav === 'saleable' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{item.stav}</span>
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs">{item.skupina_id} | {item.skupina_nazev}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné záznamy</p>
        )}
      </div>
    </div>
  )
}
