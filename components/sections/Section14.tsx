'use client'

import { useState, useMemo } from 'react'
import { Section14 as Section14Type, MarzeProduct } from '@/types/report'

interface Props {
  data: Section14Type
  date: string
}

const MARZE_FIELDS: { key: keyof MarzeProduct; label: string }[] = [
  { key: 'marze_CZ', label: 'CZ' },
  { key: 'marze_SK', label: 'SK' },
  { key: 'marze_PL', label: 'PL' },
  { key: 'marze_IT', label: 'IT' },
  { key: 'marze_CH', label: 'CH' },
  { key: 'marze_WEU', label: 'WEU' },
  { key: 'marze_GB', label: 'GB' },
  { key: 'marze_DEAT', label: 'DE/AT' },
]

function MarzeCell({ value }: { value: number }) {
  if (value < 0) {
    return <span className="font-bold text-red-600">{value.toFixed(1)} %</span>
  }
  return <span className="text-green-600">{value.toFixed(1)} %</span>
}

export default function Section14({ data, date }: Props) {
  const [openSkupina, setOpenSkupina] = useState<string | null>(data.skupiny[0]?.skupina ?? null)
  const [query, setQuery] = useState('')

  const skupiny = useMemo(() => {
    if (!query.trim()) return data.skupiny
    const q = query.toLowerCase()
    return data.skupiny
      .map((s) => ({
        ...s,
        produkty: s.produkty.filter(
          (p) =>
            p.nazev.toLowerCase().includes(q) ||
            p.kod.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.produkty.length > 0)
  }, [data.skupiny, query])

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtr podle kódu nebo názvu produktu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <a
          href={`/api/reports/${date}/export?section=14`}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </a>
      </div>

      <div className="space-y-2">
        {skupiny.map((sg) => (
          <div key={sg.skupina} className="rounded-lg border border-gray-200">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() =>
                setOpenSkupina(openSkupina === sg.skupina ? null : sg.skupina)
              }
            >
              <span className="font-medium">{sg.skupina}</span>
              <span className="text-sm text-gray-500">
                {sg.produkty.length} produktů
                <span className="ml-2">{openSkupina === sg.skupina ? '▲' : '▼'}</span>
              </span>
            </button>

            {openSkupina === sg.skupina && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2">Kód</th>
                      <th className="px-3 py-2">Název</th>
                      {MARZE_FIELDS.map((f) => (
                        <th key={f.key} className="px-3 py-2 text-right">{f.label}</th>
                      ))}
                      <th className="px-3 py-2 text-right">Skladem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sg.produkty.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.kod}</td>
                        <td className="px-3 py-2 font-medium">{p.nazev}</td>
                        {MARZE_FIELDS.map((f) => (
                          <td key={f.key} className="px-3 py-2 text-right">
                            <MarzeCell value={p[f.key] as number} />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">{p.skladem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {skupiny.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
        )}
      </div>
    </div>
  )
}
