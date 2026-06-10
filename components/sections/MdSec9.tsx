'use client'

import { MdSec9 as MdSec9Type } from '@/types/report'
import StatBars from './StatBars'

interface Props { data: MdSec9Type; date: string }

export default function MdSec9({ data }: Props) {
  const sorted = [...data.items].sort((a, b) => b.pocet - a.pocet)

  return (
    <div className="space-y-4">
      {Object.keys(data.stats.bySablona).length > 0 && (
        <StatBars data={data.stats.bySablona} title="Dle šablony" colorClass="bg-red-400" />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Šablona</th>
              <th className="px-3 py-2">Unifikovaný název</th>
              <th className="px-3 py-2 text-right">Produktů</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{item.sablona}</td>
                <td className="px-3 py-2 font-medium">{item.unif_nazev}</td>
                <td className="px-3 py-2 text-right font-semibold">{item.pocet}</td>
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
