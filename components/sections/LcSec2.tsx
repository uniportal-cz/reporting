'use client'

import { LcSec2 as LcSec2Type } from '@/types/report'

interface Props { data: LcSec2Type; date: string }

const FLAG: Record<string, string> = {
  CS: '🇨🇿', SK: '🇸🇰', DE: '🇩🇪', EN: '🇬🇧', FR: '🇫🇷', IT: '🇮🇹',
  ES: '🇪🇸', PL: '🇵🇱', HU: '🇭🇺', RO: '🇷🇴', SL: '🇸🇮', HR: '🇭🇷',
  LV: '🇱🇻', NL: '🇳🇱', DA: '🇩🇰',
}

function colorCls(n: number): string {
  if (n === 0) return 'bg-green-50 text-green-700'
  if (n < 100) return 'bg-yellow-50 text-yellow-700'
  if (n < 1000) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-800'
}

export default function LcSec2({ data }: Props) {
  const sorted = Object.entries(data.languages).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-red-600">{data.total.toLocaleString('cs-CZ')}</span>
        <span className="text-sm text-gray-500">nedokončených překladů celkem</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {sorted.map(([lang, count]) => (
          <div
            key={lang}
            className={`rounded-lg border px-3 py-2.5 text-center ${colorCls(count)}`}
          >
            <div className="text-base mb-0.5">{FLAG[lang] ?? lang}</div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1">{lang}</div>
            <div className="text-lg font-bold">{count.toLocaleString('cs-CZ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
