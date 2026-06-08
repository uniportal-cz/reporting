'use client'

import { SkSec8 as SkSec8Type } from '@/types/report'
import { parseISO, isValid } from 'date-fns'
import StatBars from './StatBars'

interface Props { data: SkSec8Type; date: string }

function formatDateTime(iso: string): string {
  try {
    const d = parseISO(iso)
    if (!isValid(d)) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return iso }
}

function formatDoba(min: number | undefined): string {
  if (min === undefined) return 'stále aktivní'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function formatAvgDoba(min: number | undefined): string {
  if (min === undefined) return '—'
  return formatDoba(min)
}

function isDokladPrevod(doklad: string): boolean {
  return /PREVOD/i.test(doklad)
}

export default function SkSec8({ data }: Props) {
  const sorted = [...data.items].sort((a, b) => {
    return new Date(b.cas_blokace).getTime() - new Date(a.cas_blokace).getTime()
  })

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Pult</th>
              <th className="px-3 py-2">Pracovník</th>
              <th className="px-3 py-2 whitespace-nowrap">Čas blokace</th>
              <th className="px-3 py-2">Produkt</th>
              <th className="px-3 py-2">Kód</th>
              <th className="px-3 py-2">Doklad</th>
              <th className="px-3 py-2">Odblokoval</th>
              <th className="px-3 py-2 whitespace-nowrap">Doba blokace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => {
              const stilLocked = !item.cas_odblokovani
              return (
                <tr key={i} className={stilLocked ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.pult ? (
                      <span className="font-semibold">{item.pult}</span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Neznámý pult</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{item.pracovnik}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-600">
                    {formatDateTime(item.cas_blokace)}
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[180px] truncate" title={item.produkt_nazev}>
                    {item.produkt_nazev || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">
                    {item.produkt_kod ? (
                      <a
                        href={`https://admin.sportega.cz/products/${item.produkt_kod}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {item.produkt_kod}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">
                    {item.doklad ? (
                      isDokladPrevod(item.doklad) ? (
                        <span className="text-gray-700">{item.doklad}</span>
                      ) : (
                        <span className="text-gray-700">{item.doklad}</span>
                      )
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {item.odblokoval || <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-xs font-semibold whitespace-nowrap ${stilLocked ? 'text-red-700' : 'text-gray-700'}`}>
                    {formatDoba(item.doba_blokace_min)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={7} className="px-3 py-2 text-xs font-semibold">
                Celkem: {data.total} blokací
                {data.stats.avg_doba_min !== undefined && (
                  <span className="ml-3 font-normal text-gray-500">
                    Průměrná doba odblokování: {formatAvgDoba(data.stats.avg_doba_min)}
                  </span>
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {(Object.keys(data.stats.byPracovnik).length > 0 || Object.keys(data.stats.byPult).length > 0) && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          {Object.keys(data.stats.byPracovnik).length > 0 && (
            <StatBars title="Dle pracovníka" data={data.stats.byPracovnik} colorClass="bg-purple-400" />
          )}
          {Object.keys(data.stats.byPult).length > 0 && (
            <StatBars title="Dle pultu" data={data.stats.byPult} colorClass="bg-gray-400" />
          )}
        </div>
      )}
    </div>
  )
}
