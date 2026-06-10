'use client'

import { useState, useMemo } from 'react'
import { MdSec11 as MdSec11Type } from '@/types/report'

interface Props { data: MdSec11Type; date: string }

const LANG_FLAGS: Record<string, string> = {
  cs: '🇨🇿', bg: '🇧🇬', da: '🇩🇰', de: '🇩🇪', el: '🇬🇷',
  en: '🇬🇧', es: '🇪🇸', fi: '🇫🇮', fr: '🇫🇷', hr: '🇭🇷',
  hu: '🇭🇺', it: '🇮🇹', lv: '🇱🇻', nl: '🇳🇱', pl: '🇵🇱',
  ro: '🇷🇴', sk: '🇸🇰', sl: '🇸🇮', uk: '🇺🇦',
}

const MAX_ITEMS_PER_LANG = 200

export default function MdSec11({ data }: Props) {
  // Default to showing 'cs', fall back to first available
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set(['cs']))
  const [filterStav, setFilterStav] = useState<'all' | 'saleable' | 'unsaleable'>('all')

  const jazyky = [...data.jazyky].sort((a, b) => {
    // cs first
    if (a.jazyk === 'cs') return -1
    if (b.jazyk === 'cs') return 1
    return b.total - a.total
  })

  // Detect systematic issue: multiple languages with the same count
  const countGroups = useMemo(() => {
    const groups: Record<number, string[]> = {}
    for (const g of data.jazyky) {
      if (!groups[g.total]) groups[g.total] = []
      groups[g.total].push(g.jazyk)
    }
    return Object.entries(groups)
      .filter(([, langs]) => langs.length >= 3)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
  }, [data.jazyky])

  const toggleLang = (lang: string) =>
    setSelectedLangs((prev) => {
      const s = new Set(prev)
      s.has(lang) ? s.delete(lang) : s.add(lang)
      return s.size > 0 ? s : new Set([lang]) // always keep at least one
    })

  const filteredProducts = useMemo(() => {
    const all = data.jazyky
      .filter((g) => selectedLangs.has(g.jazyk))
      .flatMap((g) => g.produkty.slice(0, MAX_ITEMS_PER_LANG).map((p) => ({ ...p, _jazyk: g.jazyk })))
    return filterStav === 'all' ? all : all.filter((p) => p.stav === filterStav)
  }, [data.jazyky, selectedLangs, filterStav])

  // Stats by skupina for selected languages
  const bySkupina = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const p of filteredProducts) {
      const k = `${p.skupina_id} ${p.skupina_nazev}`.trim()
      acc[k] = (acc[k] || 0) + 1
    }
    return acc
  }, [filteredProducts])

  const topSkupiny = Object.entries(bySkupina).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Systematic problem banner */}
      {countGroups.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">⚠ Možný systematický problém:</span>{' '}
          {countGroups.map(([count, langs]) =>
            `${langs.length} jazyků sdílí shodný počet ${Number(count).toLocaleString()} (${langs.join(', ')})`
          ).join('; ')}
        </div>
      )}

      {/* Language chip-list */}
      <div className="flex flex-wrap gap-2">
        {jazyky.map((g) => {
          const isSelected = selectedLangs.has(g.jazyk)
          return (
            <button
              key={g.jazyk}
              onClick={() => toggleLang(g.jazyk)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
              }`}
            >
              <span>{LANG_FLAGS[g.jazyk] ?? ''}</span>
              <span>{g.jazyk}</span>
              <span className={`rounded-full px-1.5 py-0.5 ${isSelected ? 'bg-blue-500 text-blue-100' : 'bg-gray-100 text-gray-600'}`}>
                {g.total.toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Top skupiny */}
      {topSkupiny.length > 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top skupiny</p>
          <div className="flex flex-wrap gap-2">
            {topSkupiny.map(([k, v]) => (
              <span key={k} className="rounded bg-white border border-gray-200 px-2 py-1 text-xs text-gray-700">
                {k}: <span className="font-semibold">{v}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stav filter */}
      <div className="flex gap-2">
        {(['all', 'saleable', 'unsaleable'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterStav(v)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              filterStav === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {v === 'all' ? 'Vše' : v}
          </button>
        ))}
      </div>

      {/* Products table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Jazyk</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Název</th>
              <th className="px-3 py-2">Stav</th>
              <th className="px-3 py-2">Skupina</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs">
                  <span title={item._jazyk}>{LANG_FLAGS[item._jazyk] ?? item._jazyk}</span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {item.id_url ? (
                    <a href={item.id_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {item.id}
                    </a>
                  ) : item.id}
                </td>
                <td className="px-3 py-2">
                  {item.nazev
                    ? <span className="font-medium">{item.nazev}</span>
                    : <span className="text-gray-400 italic">— (bez názvu)</span>
                  }
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    item.stav === 'saleable' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{item.stav}</span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{item.skupina_id} | {item.skupina_nazev}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Žádné produkty pro vybraný filtr</p>
        )}
        {filteredProducts.length >= MAX_ITEMS_PER_LANG && (
          <p className="py-2 text-center text-xs text-gray-400">
            Zobrazeno max. {MAX_ITEMS_PER_LANG} produktů na jazyk. Pro kompletní export kontaktujte správce.
          </p>
        )}
      </div>
    </div>
  )
}
