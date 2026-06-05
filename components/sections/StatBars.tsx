'use client'

interface Props {
  title: string
  data: Record<string, number>
  colorClass?: string
  maxItems?: number
}

export default function StatBars({ title, data, colorClass = 'bg-blue-400', maxItems = 15 }: Props) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxItems)
  if (entries.length === 0) return null
  const max = entries[0][1]
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="space-y-1.5">
        {entries.map(([label, count]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-36 flex-shrink-0 truncate text-xs text-gray-600" title={label}>{label}</div>
            <div className="flex-1 rounded-full bg-gray-100 h-2">
              <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${Math.round((count / max) * 100)}%` }} />
            </div>
            <div className="w-8 flex-shrink-0 text-right text-xs font-medium text-gray-700">{count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
