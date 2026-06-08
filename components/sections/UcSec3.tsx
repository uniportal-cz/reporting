'use client'

import { useState, useMemo } from 'react'
import { UcSec3 as UcSec3Type, UcSec3Prijemka } from '@/types/report'
import { parseISO, differenceInDays, differenceInMonths, isValid } from 'date-fns'

interface Props { data: UcSec3Type; date: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAge(isoDate: string | undefined, reportDate: string): { text: string; days: number } {
  if (!isoDate) return { text: '—', days: 0 }
  try {
    const from = parseISO(isoDate)
    const to = parseISO(reportDate)
    if (!isValid(from) || !isValid(to)) return { text: '—', days: 0 }
    const days = differenceInDays(to, from)
    const months = differenceInMonths(to, from)
    const text = months > 0
      ? `${months} ${months === 1 ? 'měsíc' : months < 5 ? 'měsíce' : 'měsíců'}`
      : `${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`
    return { text, days }
  } catch { return { text: '—', days: 0 } }
}

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return '—'
  try {
    const d = parseISO(isoDate)
    if (!isValid(d)) return isoDate
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
  } catch { return isoDate }
}

function ageRowCls(days: number) {
  if (days > 30) return 'bg-red-50'
  if (days > 14) return 'bg-orange-50'
  return ''
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PrijemkyTable({ prijemky, reportDate }: { prijemky: UcSec3Prijemka[]; reportDate: string }) {
  const sorted = [...prijemky].sort((a, b) => {
    if (!a.datum && !b.datum) return 0
    if (!a.datum) return 1
    if (!b.datum) return -1
    return a.datum.localeCompare(b.datum)
  })

  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
          <th className="px-3 py-2">ID příjemky</th>
          <th className="px-3 py-2">Datum</th>
          <th className="px-3 py-2">Stáří</th>
          <th className="px-3 py-2 text-right">Nevykryto ks</th>
          <th className="px-3 py-2 text-right">Celkem ks</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {sorted.map((p, i) => {
          const age = formatAge(p.datum, reportDate)
          const rowCls = Math.abs(p.nevykryto) > 0 ? ageRowCls(age.days) : ''
          return (
            <tr key={i} className={rowCls || 'hover:bg-gray-50'}>
              <td className="px-3 py-2 font-mono text-xs">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {p.id}
                  </a>
                ) : p.id}
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">{formatDate(p.datum)}</td>
              <td className={`px-3 py-2 text-xs font-medium ${age.days > 30 ? 'text-red-700' : age.days > 14 ? 'text-orange-700' : 'text-gray-600'}`}>
                {age.text}
              </td>
              <td className="px-3 py-2 text-right font-semibold">{Math.abs(p.nevykryto)}</td>
              <td className="px-3 py-2 text-right text-gray-500">{p.celkem ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

interface DodavatelGroup {
  dodavatel: string
  prijemky: UcSec3Prijemka[]
  nevykryto_ks: number
  celkem_ks: number
  pocet: number
  oldest_days: number
}

function buildGroups(prijemky: UcSec3Prijemka[], reportDate: string): DodavatelGroup[] {
  const map = new Map<string, UcSec3Prijemka[]>()
  for (const p of prijemky) {
    const key = p.dodavatel || '-'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }

  const groups: DodavatelGroup[] = Array.from(map.entries()).map(([dodavatel, items]) => {
    const nevykryto_ks = items.reduce((s: number, p: UcSec3Prijemka) => s + Math.abs(p.nevykryto), 0)
    const celkem_ks = items.reduce((s: number, p: UcSec3Prijemka) => s + (p.celkem ?? 0), 0)
    const oldest_days = items.reduce((max: number, p: UcSec3Prijemka) => {
      const age = formatAge(p.datum, reportDate)
      return Math.max(max, age.days)
    }, 0)
    return { dodavatel, prijemky: items, nevykryto_ks, celkem_ks, pocet: items.length, oldest_days }
  })

  return groups
    .sort((a, b) => {
      if (a.dodavatel === '-') return 1
      if (b.dodavatel === '-') return -1
      return b.nevykryto_ks - a.nevykryto_ks
    })
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UcSec3({ data, date }: Props) {
  const [expandedDodavatele, setExpandedDodavatele] = useState<Set<string>>(new Set())
  const [showNadmerne, setShowNadmerne] = useState(false)

  const nevykryte = useMemo(() => data.prijemky.filter((p) => p.nevykryto > 0), [data.prijemky])
  const nadmerne = useMemo(() => data.prijemky.filter((p) => p.nevykryto < 0), [data.prijemky])

  const nevGroups = useMemo(() => buildGroups(nevykryte, date), [nevykryte, date])
  const nadGroups = useMemo(() => buildGroups(nadmerne, date), [nadmerne, date])

  function toggleDod(key: string) {
    setExpandedDodavatele((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Nevykryté příjemky ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-xs text-red-500 font-medium">Nevykrytých příjemek</p>
            <p className="text-xl font-bold text-red-700">{data.nevykryte_count}</p>
          </div>
          <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
            <p className="text-xs text-orange-500 font-medium">Nevykryto ks celkem</p>
            <p className="text-xl font-bold text-orange-700">{data.nevykryte_ks.toLocaleString('cs-CZ')}</p>
          </div>
        </div>

        {/* Summary table by supplier */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2">Dodavatel</th>
                <th className="px-3 py-2 text-right">Příjemek</th>
                <th className="px-3 py-2 text-right">Nevykryto ks</th>
                <th className="px-3 py-2 text-right">Celkem ks</th>
                <th className="px-3 py-2 text-right">% vykrytí</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nevGroups.map((g) => {
                const isExpanded = expandedDodavatele.has(g.dodavatel)
                const pct = g.celkem_ks > 0
                  ? Math.round(((g.celkem_ks - g.nevykryto_ks) / g.celkem_ks) * 100)
                  : null
                const rowCls = g.oldest_days > 14 ? 'bg-red-50' : ''
                return [
                  <tr key={g.dodavatel} className={`${rowCls || 'hover:bg-gray-50'} cursor-pointer`} onClick={() => toggleDod(g.dodavatel)}>
                    <td className="px-3 py-2 font-medium">
                      {g.dodavatel === '-' ? <span className="text-gray-400 italic">— bez dodavatele</span> : g.dodavatel}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{g.pocet}</td>
                    <td className="px-3 py-2 text-right font-bold">{g.nevykryto_ks.toLocaleString('cs-CZ')}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{g.celkem_ks > 0 ? g.celkem_ks.toLocaleString('cs-CZ') : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {pct !== null ? (
                        <span className={pct < 50 ? 'text-red-600 font-semibold' : 'text-gray-600'}>{pct} %</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${g.dodavatel}_detail`}>
                      <td colSpan={6} className="px-0 py-0 bg-blue-50">
                        <div className="overflow-x-auto px-4 py-2">
                          <PrijemkyTable prijemky={g.prijemky} reportDate={date} />
                        </div>
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Nadměrně vykryté příjemky ── */}
      <div className="space-y-2">
        <button
          onClick={() => setShowNadmerne(!showNadmerne)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <span className={`text-xs px-2 py-0.5 rounded-full ${data.nadmerne_count > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
            {data.nadmerne_count > 0 ? data.nadmerne_count : '✓'}
          </span>
          Nadměrně vykryté příjemky
          <span className="text-gray-400 text-xs">{showNadmerne ? '▲' : '▼'}</span>
        </button>

        {showNadmerne && (
          data.nadmerne_count === 0 ? (
            <p className="text-sm text-green-700 px-3">V pořádku — žádné nadměrně vykryté příjemky</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-orange-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-orange-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">ID příjemky</th>
                    <th className="px-3 py-2">Datum</th>
                    <th className="px-3 py-2">Stáří</th>
                    <th className="px-3 py-2">Dodavatel</th>
                    <th className="px-3 py-2 text-right">Nadměrně vykryto ks</th>
                    <th className="px-3 py-2 text-right">Celkem ks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {nadmerne.map((p, i) => {
                    const age = formatAge(p.datum, date)
                    return (
                      <tr key={i} className="bg-orange-50 hover:bg-orange-100">
                        <td className="px-3 py-2 font-mono text-xs">
                          {p.url ? (
                            <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{p.id}</a>
                          ) : p.id}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{formatDate(p.datum)}</td>
                        <td className="px-3 py-2 text-xs font-medium text-orange-700">{age.text}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {p.dodavatel === '-' ? <span className="text-gray-400 italic">—</span> : p.dodavatel}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-orange-700">{Math.abs(p.nevykryto)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{p.celkem ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
