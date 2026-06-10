'use client'

import { useState } from 'react'
import { LcSec7 as LcSec7Type } from '@/types/report'

interface Props { data: LcSec7Type; date: string }

const LANG_FLAG: Record<string, string> = {
  cs: '🇨🇿', sk: '🇸🇰', de: '🇩🇪', en: '🇬🇧', fr: '🇫🇷', it: '🇮🇹',
  es: '🇪🇸', pl: '🇵🇱', hu: '🇭🇺', ro: '🇷🇴', sl: '🇸🇮', lv: '🇱🇻',
  nl: '🇳🇱', da: '🇩🇰',
}

export default function LcSec7({ data }: Props) {
  const [filterLang, setFilterLang] = useState('')
  const [showUnused, setShowUnused] = useState(false)

  const allLangs = Array.from(new Set(data.items.flatMap((i) => i.languages))).sort()

  const filtered = data.items.filter((item) => {
    if (!showUnused && item.isUnused) return false
    if (filterLang && !item.languages.includes(filterLang)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={`text-2xl font-bold ${data.total > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          {data.total}
        </span>
        <span className="text-sm text-gray-500">šablon s nevyplněným vzorcem pro název</span>
        {data.has_more && (
          <span className="text-xs text-gray-400 ml-auto">
            (zobrazeno pouze prvních {data.items.length})
          </span>
        )}
      </div>

      {data.items.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Všechny jazyky</option>
              {allLangs.map((l) => (
                <option key={l} value={l}>{LANG_FLAG[l] ?? l.toUpperCase()} {l.toUpperCase()}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnused}
                onChange={(e) => setShowUnused(e.target.checked)}
                className="rounded"
              />
              Zobrazit NEPOUŽÍVAT šablony
            </label>

            {(filterLang || showUnused) && (
              <button
                onClick={() => { setFilterLang(''); setShowUnused(false) }}
                className="rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                Zrušit filtry
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 text-left">Šablona</th>
                  <th className="px-3 py-2 text-left">Jazyky bez vzorce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item, i) => (
                  <tr key={i} className={item.isUnused ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2 font-medium">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {item.name}
                        </a>
                      ) : item.name}
                      {item.isUnused && (
                        <span className="ml-2 rounded bg-orange-200 px-1.5 py-0.5 text-xs font-semibold text-orange-800">
                          NEPOUŽÍVAT
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {item.languages.map((lang) => (
                          <span key={lang} className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                            {LANG_FLAG[lang] ?? lang.toUpperCase()} {lang.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
