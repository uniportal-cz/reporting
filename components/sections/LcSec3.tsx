'use client'

import { LcSec3 as LcSec3Type } from '@/types/report'

interface Props { data: LcSec3Type; date: string }

// ISO3 → {flag, iso2}
const ISO3_INFO: Record<string, { flag: string; name: string }> = {
  FRA: { flag: '🇫🇷', name: 'Francie' },
  HRV: { flag: '🇭🇷', name: 'Chorvatsko' },
  NLD: { flag: '🇳🇱', name: 'Nizozemsko' },
  AUT: { flag: '🇦🇹', name: 'Rakousko' },
  CZE: { flag: '🇨🇿', name: 'Česko' },
  SVK: { flag: '🇸🇰', name: 'Slovensko' },
  ROU: { flag: '🇷🇴', name: 'Rumunsko' },
  SVN: { flag: '🇸🇮', name: 'Slovinsko' },
  DEU: { flag: '🇩🇪', name: 'Německo' },
  LVA: { flag: '🇱🇻', name: 'Lotyšsko' },
  ESP: { flag: '🇪🇸', name: 'Španělsko' },
  IRL: { flag: '🇮🇪', name: 'Irsko' },
  BEL: { flag: '🇧🇪', name: 'Belgie' },
  ITA: { flag: '🇮🇹', name: 'Itálie' },
  CHE: { flag: '🇨🇭', name: 'Švýcarsko' },
  LUX: { flag: '🇱🇺', name: 'Lucembursko' },
  HUN: { flag: '🇭🇺', name: 'Maďarsko' },
  DNK: { flag: '🇩🇰', name: 'Dánsko' },
  POL: { flag: '🇵🇱', name: 'Polsko' },
  GBR: { flag: '🇬🇧', name: 'Velká Británie' },
}

export default function LcSec3({ data }: Props) {
  const entries = Object.entries(data.countries)
  const sorted = entries.sort(([, a], [, b]) => b.unFilled - a.unFilled)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-orange-600">{data.total_unfilled.toLocaleString('cs-CZ')}</span>
        <span className="text-sm text-gray-500">chybějících DPH sazeb celkem</span>
        {data.generatedAt && (
          <span className="text-xs text-gray-400 ml-auto">
            Vygenerováno: {data.generatedAt.replace('T', ' ').slice(0, 16)}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Země</th>
              <th className="px-3 py-2 text-right">Vyplněno</th>
              <th className="px-3 py-2 text-right">Chybí</th>
              <th className="px-3 py-2">Pokrytí</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(([iso3, country]) => {
              const info = ISO3_INFO[iso3]
              const total = country.filled + country.unFilled
              const pct = total > 0 ? Math.round((country.filled / total) * 100) : 0
              const barCls = pct === 100
                ? 'bg-green-400'
                : pct >= 80
                ? 'bg-yellow-400'
                : 'bg-red-400'

              return (
                <tr key={iso3} className={country.unFilled > 0 ? 'hover:bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2 font-medium">
                    {info ? (
                      <span className="flex items-center gap-2">
                        <span className="text-base">{info.flag}</span>
                        <span>{info.name}</span>
                        <span className="text-xs text-gray-400">({iso3})</span>
                      </span>
                    ) : iso3}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">{country.filled.toLocaleString('cs-CZ')}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${country.unFilled > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {country.unFilled > 0 ? country.unFilled.toLocaleString('cs-CZ') : '✓'}
                  </td>
                  <td className="px-3 py-2 w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                        <div
                          className={`h-1.5 rounded-full ${barCls}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-9 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
