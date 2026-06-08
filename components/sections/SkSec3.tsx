'use client'

import { SkSec3 as SkSec3Type } from '@/types/report'

interface Props { data: SkSec3Type; date: string }

export default function SkSec3({ data }: Props) {
  const sorted = [...data.sklady].sort((a, b) => b.celkem - a.celkem)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Sklad</th>
              <th className="px-3 py-2 text-right">K hledání</th>
              <th className="px-3 py-2 text-right">K balení</th>
              <th className="px-3 py-2 text-right">Celkem</th>
              <th className="px-3 py-2">Podíl hledání</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((sk, i) => {
              const podilHledani = sk.celkem > 0 ? Math.round((sk.k_hledani / sk.celkem) * 100) : 0
              const isOverloaded = podilHledani > 70
              return (
                <tr key={i} className={isOverloaded ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2 font-medium">{sk.sklad}</td>
                  <td className="px-3 py-2 text-right text-blue-700 font-medium">
                    {sk.k_hledani.toLocaleString('cs-CZ')}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700 font-medium">
                    {sk.k_baleni.toLocaleString('cs-CZ')}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">{sk.celkem.toLocaleString('cs-CZ')}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full bg-gray-100 h-1.5 max-w-[80px]">
                        <div
                          className={`h-1.5 rounded-full ${isOverloaded ? 'bg-amber-500' : 'bg-blue-400'}`}
                          style={{ width: `${podilHledani}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isOverloaded ? 'text-amber-700' : 'text-gray-500'}`}>
                        {podilHledani}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
              <td className="px-3 py-2">Celkem</td>
              <td className="px-3 py-2 text-right text-blue-700">{data.k_hledani.toLocaleString('cs-CZ')}</td>
              <td className="px-3 py-2 text-right text-green-700">{data.k_baleni.toLocaleString('cs-CZ')}</td>
              <td className="px-3 py-2 text-right">{data.total.toLocaleString('cs-CZ')}</td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      {data.total > 0 && Math.round((data.k_hledani / data.total) * 100) > 70 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 border border-amber-200">
          Poměr hledání {Math.round((data.k_hledani / data.total) * 100)}% — přetížení fronty hledání
        </p>
      )}
    </div>
  )
}
