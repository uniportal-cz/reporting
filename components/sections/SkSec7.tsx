'use client'

import { SkSec7 as SkSec7Type } from '@/types/report'

interface Props { data: SkSec7Type; date: string }

export default function SkSec7({ data }: Props) {
  const sorted = [...data.items].sort((a, b) => b.celkem - a.celkem)
  const totalPlus = sorted.reduce((s, i) => s + i.plus, 0)
  const totalMinus = sorted.reduce((s, i) => s + i.minus, 0)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Kategorie</th>
              <th className="px-3 py-2 text-right">Plusové</th>
              <th className="px-3 py-2 text-right">Mínusové</th>
              <th className="px-3 py-2 text-right">Celkem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{item.kategorie}</td>
                <td className="px-3 py-2 text-right">
                  {item.plus > 0 ? (
                    <span className="font-semibold text-green-700">+{item.plus}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.minus > 0 ? (
                    <span className="font-semibold text-red-700">-{item.minus}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-bold">{item.celkem}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
              <td className="px-3 py-2">Celkem</td>
              <td className="px-3 py-2 text-right text-green-700">+{totalPlus}</td>
              <td className="px-3 py-2 text-right text-red-700">-{totalMinus}</td>
              <td className="px-3 py-2 text-right">{data.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data.odkaz && (
        <a
          href={data.odkaz}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Zobrazit v systému ({data.total} korekcí)
        </a>
      )}
    </div>
  )
}
