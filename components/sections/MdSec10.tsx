'use client'

import { useState } from 'react'
import { MdSec10 as MdSec10Type } from '@/types/report'

interface Props { data: MdSec10Type; date: string }

const LANG_FLAGS: Record<string, string> = {
  bg: '🇧🇬', el: '🇬🇷', fi: '🇫🇮', hr: '🇭🇷', uk: '🇺🇦',
  cs: '🇨🇿', da: '🇩🇰', de: '🇩🇪', en: '🇬🇧', es: '🇪🇸',
  fr: '🇫🇷', hu: '🇭🇺', it: '🇮🇹', lv: '🇱🇻', nl: '🇳🇱',
  pl: '🇵🇱', ro: '🇷🇴', sk: '🇸🇰', sl: '🇸🇮',
}

const MAX_VALUES_PREVIEW = 30

export default function MdSec10({ data }: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setExpandedRows((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  // Sort by unique value count desc for nevyplnene
  const nevyplSorted = [...data.nevyplnene].sort((a, b) => b.hodnoty.length - a.hodnoty.length)

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          <p className="text-xs text-red-500 font-medium">Nevyplněné hodnoty</p>
          <p className="text-xl font-bold text-red-700">{data.nevyplnene_total}</p>
        </div>
        <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
          <p className="text-xs text-orange-500 font-medium">Nepřeložené texty</p>
          <p className="text-xl font-bold text-orange-700">{data.neprelozene_total}</p>
        </div>
      </div>

      {/* Section 1: Nevyplněné hodnoty */}
      {nevyplSorted.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Nevyplněné hodnoty vlastností</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">Šablona</th>
                  <th className="px-3 py-2">Unif. název</th>
                  <th className="px-3 py-2">Vlastnost</th>
                  <th className="px-3 py-2 text-right">Unikátních hodnot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nevyplSorted.map((item, i) => {
                  const unique = Array.from(new Set(item.hodnoty))
                  const isExp = expandedRows.has(i)
                  return (
                    <>
                      <tr
                        key={`row-${i}`}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggle(i)}
                      >
                        <td className="px-3 py-2">
                          {item.sablona_url ? (
                            <a href={item.sablona_url} target="_blank" rel="noreferrer"
                              className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                              {item.sablona}
                            </a>
                          ) : item.sablona}
                        </td>
                        <td className="px-3 py-2">{item.unif_nazev}</td>
                        <td className="px-3 py-2 font-medium">{item.vlastnost}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-semibold">{unique.length}</span>
                            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExp ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`exp-${i}`}>
                          <td colSpan={4} className="px-3 py-2 bg-gray-50 text-xs text-gray-600">
                            {unique.slice(0, MAX_VALUES_PREVIEW).join(', ')}
                            {unique.length > MAX_VALUES_PREVIEW && (
                              <span className="ml-1 text-gray-400">… +{unique.length - MAX_VALUES_PREVIEW} dalších</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Nepřeložené texty */}
      {data.neprelozene.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Nepřeložené zástupné texty</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">Šablona</th>
                  <th className="px-3 py-2">Vlastnost</th>
                  <th className="px-3 py-2">Jazyky</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.neprelozene.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {item.sablona_url ? (
                        <a href={item.sablona_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {item.sablona}
                        </a>
                      ) : item.sablona}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.vlastnost}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {item.jazyky.map((lang) => (
                          <span key={lang} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                            {LANG_FLAGS[lang] ?? ''} {lang}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
