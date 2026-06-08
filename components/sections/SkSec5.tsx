'use client'

import { SkSec5 as SkSec5Type } from '@/types/report'
import { parseISO, differenceInDays, differenceInMonths, isValid } from 'date-fns'

interface Props { data: SkSec5Type; date: string }

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

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    const d = parseISO(iso)
    if (!isValid(d)) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
  } catch { return iso }
}

export default function SkSec5({ data, date }: Props) {
  const sorted = [...data.items].sort((a, b) => b.pocet - a.pocet)

  return (
    <div className="space-y-1">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Sklad</th>
              <th className="px-3 py-2 text-right">Počet úkolů</th>
              <th className="px-3 py-2">Nejstarší úkol</th>
              <th className="px-3 py-2">Stáří nejstaršího</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, i) => {
              const age = formatAge(item.nejstarsi, date)
              const isOld = age.days > 30
              return (
                <tr key={i} className={isOld ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2 font-medium">{item.sklad}</td>
                  <td className="px-3 py-2 text-right font-bold">{item.pocet.toLocaleString('cs-CZ')}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{formatDate(item.nejstarsi)}</td>
                  <td className={`px-3 py-2 text-xs font-semibold ${isOld ? 'text-red-700' : 'text-gray-700'}`}>
                    {age.text}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-3 py-2 font-semibold">Celkem</td>
              <td className="px-3 py-2 text-right font-bold">{data.total.toLocaleString('cs-CZ')}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
