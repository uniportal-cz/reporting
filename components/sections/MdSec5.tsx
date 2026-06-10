'use client'

import { useState } from 'react'
import { MdSec5 as MdSec5Type } from '@/types/report'

interface Props { data: MdSec5Type; date: string }

export default function MdSec5({ data }: Props) {
  const [open, setOpen] = useState<Set<number>>(new Set())
  const sorted = [...data.sablony].sort((a, b) => b.nazvy.length - a.nazvy.length)

  const toggle = (i: number) =>
    setOpen((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm mb-3">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Šablona</th>
              <th className="px-3 py-2 text-right">Názvů s problémem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((sb, i) => (
              <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(i)}>
                <td className="px-3 py-2 font-medium">
                  {sb.sablona_url ? (
                    <a
                      href={sb.sablona_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {sb.sablona}
                    </a>
                  ) : sb.sablona}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-semibold text-red-700">{sb.nazvy.length}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${open.has(i) ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.map((sb, i) => open.has(i) && (
        <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{sb.sablona}</p>
          <ul className="space-y-1">
            {sb.nazvy.map((n, j) => (
              <li key={j} className="text-sm text-gray-700">• {n}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
