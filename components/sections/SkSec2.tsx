'use client'

import { SkSec2 as SkSec2Type } from '@/types/report'
import { parseISO, differenceInDays, isValid } from 'date-fns'

interface Props { data: SkSec2Type; date: string }

export default function SkSec2({ data, date }: Props) {
  let ageDays: number | null = null
  if (data.nejstarsi) {
    try {
      const d = parseISO(data.nejstarsi)
      const ref = parseISO(date + 'T23:59:59')
      if (isValid(d)) ageDays = differenceInDays(ref, d)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-gray-900">{data.total}</span>
        <span className="text-sm text-gray-500">nepodaných balíků</span>
      </div>

      {data.nejstarsi && (
        <div className={`rounded-lg px-4 py-3 text-sm ${ageDays !== null && ageDays > 1 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          <span className="font-semibold">Nejstarší balík:</span>{' '}
          {formatDate(data.nejstarsi)}
          {ageDays !== null && (
            <span className="ml-2 font-semibold">
              ({ageDays === 1 ? '1 den' : `${ageDays} dní`} čeká)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = parseISO(iso)
    if (!isValid(d)) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}
