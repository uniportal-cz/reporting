'use client'

import { useState, useMemo } from 'react'

export function useTableFilter<T extends Record<string, unknown>>(
  items: T[],
  keys: (keyof T)[]
) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((item) =>
      keys.some((k) => String(item[k] ?? '').toLowerCase().includes(q))
    )
  }, [items, query, keys])

  return { filtered, query, setQuery }
}
