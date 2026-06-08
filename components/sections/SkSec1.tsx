'use client'

import { SkSec1 as SkSec1Type } from '@/types/report'
import { parseISO, differenceInHours, isValid } from 'date-fns'
import StatBars from './StatBars'

interface Props { data: SkSec1Type; date: string }

function formatProdleva(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function isOlderThan24h(uzavreno: string | undefined, reportDate: string): boolean {
  if (!uzavreno) return false
  const uzavDate = parseISO(uzavreno)
  const refDate = parseISO(reportDate + 'T23:59:59')
  if (!isValid(uzavDate)) return false
  return differenceInHours(refDate, uzavDate) >= 24
}

export default function SkSec1({ data, date }: Props) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Objednávka</th>
              <th className="px-3 py-2">Dopravce</th>
              <th className="px-3 py-2">Stav</th>
              <th className="px-3 py-2">Vytvořen</th>
              <th className="px-3 py-2">Uzavřen</th>
              <th className="px-3 py-2">Prodleva</th>
              <th className="px-3 py-2">Důvod</th>
              <th className="px-3 py-2">Odpovídá</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.baliky.map((b, i) => {
              const old = isOlderThan24h(b.uzavreno, date)
              return (
                <tr key={i} className={`${old ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {b.objednavka_url ? (
                      <a href={b.objednavka_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {b.objednavka}
                      </a>
                    ) : b.objednavka}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{b.dopravce}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {b.stav}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {b.vytvoreno ? formatDateTime(b.vytvoreno) : '—'}
                  </td>
                  <td className={`px-3 py-2 text-xs whitespace-nowrap ${old ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {b.uzavreno ? formatDateTime(b.uzavreno) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium whitespace-nowrap">
                    {b.prodleva_min !== undefined ? formatProdleva(b.prodleva_min) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{b.duvod || '—'}</td>
                  <td className="px-3 py-2 text-xs font-medium text-gray-700">{b.odpovida || '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={8} className="px-3 py-2 text-xs font-semibold">Celkem: {data.total} balíků</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {(Object.keys(data.stats.byDuvod).length > 0 || Object.keys(data.stats.byDopravce).length > 0) && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          {Object.keys(data.stats.byDuvod).length > 0 && (
            <StatBars title="Dle důvodu uzavření" data={data.stats.byDuvod} colorClass="bg-orange-400" />
          )}
          {Object.keys(data.stats.byDopravce).length > 0 && (
            <StatBars title="Dle dopravce" data={data.stats.byDopravce} colorClass="bg-blue-400" />
          )}
        </div>
      )}
    </div>
  )
}

function formatDateTime(iso: string): string {
  try {
    const d = parseISO(iso)
    if (!isValid(d)) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())} / ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
  } catch {
    return iso
  }
}
