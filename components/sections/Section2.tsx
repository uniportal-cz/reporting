'use client'

import { useState } from 'react'
import { Section2 as Section2Type } from '@/types/report'

interface Props {
  data: Section2Type
  date: string
}

export default function Section2({ data, date }: Props) {
  const [openDodavatel, setOpenDodavatel] = useState<string | null>(
    data.dodavatele[0]?.dodavatel ?? null
  )

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a
          href={`/api/reports/${date}/export?section=2`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="space-y-2">
        {data.dodavatele.map((d) => (
          <div key={d.dodavatel} className="rounded-lg border border-gray-200">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() =>
                setOpenDodavatel(openDodavatel === d.dodavatel ? null : d.dodavatel)
              }
            >
              <span className="font-medium">{d.dodavatel}</span>
              <span className="text-sm text-gray-500">
                {d.produkty.length} produktů
                <span className="ml-2">{openDodavatel === d.dodavatel ? '▲' : '▼'}</span>
              </span>
            </button>

            {openDodavatel === d.dodavatel && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2">Kód</th>
                      <th className="px-3 py-2">Název</th>
                      <th className="px-3 py-2">Skupina</th>
                      <th className="px-3 py-2">Admin</th>
                      <th className="px-3 py-2 text-right">Skladem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {d.produkty.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.kod}</td>
                        <td className="px-3 py-2 font-medium">{p.nazev}</td>
                        <td className="px-3 py-2 text-gray-600">{p.skupina}</td>
                        <td className="px-3 py-2 text-gray-600">{p.admin}</td>
                        <td className="px-3 py-2 text-right">{p.skladem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
