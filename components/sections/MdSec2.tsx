'use client'

import { useState } from 'react'
import { MdSec2 as MdSec2Type } from '@/types/report'
import StatBars from './StatBars'

interface Props { data: MdSec2Type; date: string }

const MAX_VISIBLE_VALUES = 3

export default function MdSec2({ data }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const sorted = [...data.items].sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'))

  const toggle = (i: number) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  return (
    <div className="space-y-4">
      {(Object.keys(data.stats.byTyp).length > 0 || Object.keys(data.stats.byVlastnost).length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.keys(data.stats.byTyp).length > 0 && (
            <StatBars data={data.stats.byTyp} title="Dle typu produktu" colorClass="bg-purple-400" />
          )}
          {Object.keys(data.stats.byVlastnost).length > 0 && (
            <StatBars data={data.stats.byVlastnost} title="Dle vlastnosti" colorClass="bg-blue-400" />
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Název produktu</th>
              <th className="px-3 py-2">Typ</th>
              <th className="px-3 py-2">Vlastnost</th>
              <th className="px-3 py-2">Hodnoty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => {
              const isExp = expanded.has(i)
              const vals = item.hodnoty
              const visible = isExp ? vals : vals.slice(0, MAX_VISIBLE_VALUES)
              const extra = vals.length - MAX_VISIBLE_VALUES

              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.id_url ? (
                      <a href={item.id_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {item.id}
                      </a>
                    ) : item.id}
                  </td>
                  <td className="px-3 py-2 font-medium max-w-[200px] truncate" title={item.nazev}>{item.nazev}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{item.typ}</td>
                  <td className="px-3 py-2 text-gray-700">{item.vlastnost}</td>
                  <td className="px-3 py-2">
                    <span className="text-gray-700">{visible.join(', ')}</span>
                    {!isExp && extra > 0 && (
                      <button
                        onClick={() => toggle(i)}
                        className="ml-1 text-xs text-blue-500 hover:underline"
                      >
                        +{extra} dalších
                      </button>
                    )}
                    {isExp && vals.length > MAX_VISIBLE_VALUES && (
                      <button
                        onClick={() => toggle(i)}
                        className="ml-1 text-xs text-gray-400 hover:underline"
                      >
                        skrýt
                      </button>
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
    </div>
  )
}
