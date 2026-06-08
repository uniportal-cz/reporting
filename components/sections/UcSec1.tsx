'use client'

import { UcSec1 as UcSec1Type } from '@/types/report'

interface Props { data: UcSec1Type; date: string }

export default function UcSec1({ data }: Props) {
  const sorted = [...data.items]
    .map((i) => ({ ...i, ks_celkem: i.ks_closed + i.ks_inprocess }))
    .sort((a, b) => b.ks_celkem - a.ks_celkem)

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          <p className="text-xs text-red-500 font-medium">Closed</p>
          <p className="text-xl font-bold text-red-700">{data.ks_closed} ks</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          <p className="text-xs text-amber-500 font-medium">In process</p>
          <p className="text-xl font-bold text-amber-700">{data.ks_inprocess} ks</p>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <p className="text-xs text-gray-500 font-medium">Celkem</p>
          <p className="text-xl font-bold text-gray-800">{data.total_ks} ks</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Dodavatel</th>
              <th className="px-3 py-2 text-right">Closed</th>
              <th className="px-3 py-2 text-right">In process</th>
              <th className="px-3 py-2 text-right">Celkem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className={item.ks_closed > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-3 py-2 font-medium">{item.dodavatel}</td>
                <td className="px-3 py-2 text-right">
                  {item.ks_closed > 0 ? (
                    <span className="font-semibold text-red-700">{item.ks_closed}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.ks_inprocess > 0 ? (
                    <span className="text-amber-700">{item.ks_inprocess}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-bold">{item.ks_celkem}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
              <td className="px-3 py-2">Celkem</td>
              <td className="px-3 py-2 text-right text-red-700">{data.ks_closed}</td>
              <td className="px-3 py-2 text-right text-amber-700">{data.ks_inprocess}</td>
              <td className="px-3 py-2 text-right">{data.total_ks}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
