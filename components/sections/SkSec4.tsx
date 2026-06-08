'use client'

import { SkSec4 as SkSec4Type } from '@/types/report'
import { parseISO, differenceInDays, differenceInMonths, differenceInYears, isValid } from 'date-fns'

interface Props { data: SkSec4Type; date: string }

function formatAge(isoDate: string | undefined, reportDate: string): { text: string; days: number } {
  if (!isoDate) return { text: '—', days: 0 }
  try {
    const from = parseISO(isoDate)
    const to = parseISO(reportDate)
    if (!isValid(from) || !isValid(to)) return { text: '—', days: 0 }

    const days = differenceInDays(to, from)
    const months = differenceInMonths(to, from)
    const years = differenceInYears(to, from)

    let text: string
    if (years > 0) {
      const remMonths = differenceInMonths(to, from) - years * 12
      text = remMonths > 0 ? `${years} r. ${remMonths} m.` : `${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'let'}`
    } else if (months > 0) {
      text = `${months} ${months === 1 ? 'měsíc' : months < 5 ? 'měsíce' : 'měsíců'}`
    } else {
      text = `${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`
    }

    return { text, days }
  } catch {
    return { text: '—', days: 0 }
  }
}

function ageColor(days: number): string {
  if (days > 30) return 'bg-red-50 text-red-700'
  if (days > 7) return 'bg-orange-50 text-orange-700'
  return ''
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

export default function SkSec4({ data, date }: Props) {
  const sorted = [...data.items].sort((a, b) => {
    const dA = differenceInDays(parseISO(date), a.vytvoreno ? parseISO(a.vytvoreno) : new Date(0))
    const dB = differenceInDays(parseISO(date), b.vytvoreno ? parseISO(b.vytvoreno) : new Date(0))
    return dB - dA
  })

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Vytvořeno</th>
            <th className="px-3 py-2">Stáří</th>
            <th className="px-3 py-2">Ze skladu</th>
            <th className="px-3 py-2">Do skladu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((item, i) => {
            const age = formatAge(item.vytvoreno, date)
            const rowCls = ageColor(age.days)
            return (
              <tr key={i} className={rowCls || 'hover:bg-gray-50'}>
                <td className="px-3 py-2 font-mono text-xs">
                  {item.id_url ? (
                    <a href={item.id_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {item.id}
                    </a>
                  ) : item.id}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(item.vytvoreno)}</td>
                <td className={`px-3 py-2 text-xs font-semibold ${age.days > 30 ? 'text-red-700' : age.days > 7 ? 'text-orange-700' : 'text-gray-700'}`}>
                  {age.text}
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs">{item.ze}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{item.do}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td colSpan={5} className="px-3 py-2 text-xs font-semibold">Celkem: {data.total} převodek</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
