'use client'

import { MdSec3 as MdSec3Type } from '@/types/report'

interface Props { data: MdSec3Type; date: string }

export default function MdSec3({ data }: Props) {
  const sorted = [...data.items].sort((a, b) => b.pocet - a.pocet)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-3 py-2">Unifikovaný název</th>
            <th className="px-3 py-2 text-right">Počet produktů</th>
            <th className="px-3 py-2">Poznámka</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((item, i) => {
            const isNepouz = item.nazev.toUpperCase().includes('NEPOUŽÍVAT')
            const isZero = item.pocet === 0
            return (
              <tr key={i} className={isNepouz ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                <td className={`px-3 py-2 font-medium ${isNepouz ? 'text-orange-800' : isZero ? 'text-gray-400' : ''}`}>
                  {item.nazev}
                </td>
                <td className={`px-3 py-2 text-right ${isZero ? 'text-gray-300' : 'font-semibold'}`}>
                  {item.pocet}
                </td>
                <td className="px-3 py-2 text-xs">
                  {isNepouz && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700 font-medium">⚠ NEPOUŽÍVAT</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">Žádné záznamy</p>
      )}
    </div>
  )
}
