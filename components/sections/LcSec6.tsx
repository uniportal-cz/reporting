'use client'

import { useState } from 'react'
import { LcSec6 as LcSec6Type } from '@/types/report'

interface Props { data: LcSec6Type; date: string }

type SubKey = keyof LcSec6Type['subsections']

const FLAG: Record<string, string> = {
  CS: '🇨🇿', SK: '🇸🇰', DE: '🇩🇪', EN: '🇬🇧', FR: '🇫🇷', IT: '🇮🇹',
  ES: '🇪🇸', PL: '🇵🇱', HU: '🇭🇺', RO: '🇷🇴', SL: '🇸🇮', LV: '🇱🇻',
  NL: '🇳🇱', DA: '🇩🇰',
}

const SUB_LABELS: { key: SubKey; label: string }[] = [
  { key: 'unifikovanyNazev', label: 'Unifikovaný název' },
  { key: 'nazevAuta',        label: 'Název auta' },
  { key: 'konfigurace',      label: 'Konfigurace' },
  { key: 'thuleSloupec',     label: 'Thule sloupec' },
  { key: 'vlastnost',        label: 'Vlastnost' },
]

export default function LcSec6({ data }: Props) {
  const [expandedKey, setExpandedKey] = useState<SubKey | null>(null)

  // Detect systematic language problem: ≥3 subsections share same most-common missing language
  const langCounts: Record<string, number> = {}
  for (const sub of Object.values(data.subsections)) {
    if (sub.items.length === 0) continue
    const allLangs: Record<string, number> = {}
    for (const item of sub.items) {
      for (const lang of item.languages) {
        allLangs[lang] = (allLangs[lang] ?? 0) + 1
      }
    }
    const topLang = Object.entries(allLangs).sort(([, a], [, b]) => b - a)[0]?.[0]
    if (topLang) langCounts[topLang] = (langCounts[topLang] ?? 0) + 1
  }
  const systemicLang = Object.entries(langCounts).find(([, c]) => c >= 3)?.[0]

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-blue-700">{data.total.toLocaleString('cs-CZ')}</span>
        <span className="text-sm text-gray-500">záznamů celkem bez překladu</span>
        {data.generatedAt && (
          <span className="text-xs text-gray-400 ml-auto">
            {data.generatedAt.replace('T', ' ').slice(0, 16)}
          </span>
        )}
      </div>

      {systemicLang && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-2 text-sm text-orange-800">
          <strong>Systémový problém:</strong> jazyk {FLAG[systemicLang] ?? systemicLang} <strong>{systemicLang}</strong> je chybějící ve ≥3 kategoriích Thule generátoru.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {SUB_LABELS.map(({ key, label }) => {
          const sub = data.subsections[key]
          return (
            <button
              key={key}
              onClick={() => setExpandedKey(expandedKey === key ? null : key)}
              className={`rounded-lg border p-3 text-left transition-all ${
                expandedKey === key
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`text-xl font-bold ${sub.total > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {sub.total.toLocaleString('cs-CZ')}
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded items */}
      {expandedKey && (() => {
        const sub = data.subsections[expandedKey]
        if (sub.items.length === 0) return (
          <p className="text-center text-sm text-gray-400 py-4">Žádné položky</p>
        )
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 text-left">Typ</th>
                  <th className="px-3 py-2 text-left">Název / ID</th>
                  <th className="px-3 py-2 text-left">Jazyky</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sub.items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-500">{item.type}</td>
                    <td className="px-3 py-2 font-medium">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {item.name}
                        </a>
                      ) : item.name}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {item.languages.map((lang) => (
                          <span key={lang} className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                            {FLAG[lang] ?? lang} {lang}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })()}
    </div>
  )
}
