'use client'

import { LcSec5 as LcSec5Type } from '@/types/report'

interface Props { data: LcSec5Type; date: string }

const FLAG: Record<string, string> = {
  CS: '🇨🇿', SK: '🇸🇰', DE: '🇩🇪', EN: '🇬🇧', FR: '🇫🇷', IT: '🇮🇹',
  ES: '🇪🇸', PL: '🇵🇱', HU: '🇭🇺', RO: '🇷🇴', SL: '🇸🇮', LV: '🇱🇻',
  NL: '🇳🇱', DA: '🇩🇰',
}

function cellColor(n: number): string {
  if (n === 0) return 'bg-green-50 text-green-600'
  if (n < 100) return 'bg-yellow-50 text-yellow-700'
  if (n < 1000) return 'bg-orange-50 text-orange-700 font-semibold'
  return 'bg-red-100 text-red-800 font-bold'
}

export default function LcSec5({ data }: Props) {
  const entityTypes = Object.keys(data.rows)

  if (entityTypes.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Žádná data</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-orange-600">{data.nonzero_combos.toLocaleString('cs-CZ')}</span>
        <span className="text-sm text-gray-500">kombinací entita+jazyk s chybějícím překladem</span>
        {data.generatedAt && (
          <span className="text-xs text-gray-400 ml-auto">
            {data.generatedAt.replace('T', ' ').slice(0, 16)}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <th className="px-3 py-2 text-left min-w-[200px]">Typ entity</th>
              {data.languages.map((lang) => (
                <th key={lang} className="px-1.5 py-2 text-center min-w-[2.5rem]">
                  {FLAG[lang] ?? lang}
                  <br />
                  <span className="text-xs normal-case font-normal">{lang}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entityTypes.map((entityType) => {
              const row = data.rows[entityType]
              const rowTotal = data.languages.reduce((s, l) => s + (row[l] ?? 0), 0)
              return (
                <tr key={entityType} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-medium text-gray-800">
                    {entityType}
                    {rowTotal > 0 && (
                      <span className="ml-2 text-xs text-gray-400">({rowTotal.toLocaleString('cs-CZ')})</span>
                    )}
                  </td>
                  {data.languages.map((lang) => {
                    const v = row[lang] ?? 0
                    return (
                      <td key={lang} className={`px-1.5 py-1.5 text-center ${cellColor(v)}`}>
                        {v === 0 ? '✓' : v.toLocaleString('cs-CZ')}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" /> 0 (OK)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 inline-block" /> 1–99</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" /> 100–999</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> ≥1000</span>
      </div>
    </div>
  )
}
