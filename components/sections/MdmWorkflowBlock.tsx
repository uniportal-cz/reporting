'use client'

import { useState, useMemo } from 'react'
import { MdSec4 as MdSec4Type } from '@/types/report'

interface Props {
  data: MdSec4Type
  highlightColor?: 'blue' | 'yellow'
}

const COL_LABELS = [
  { key: 'sablona', label: 'Šablona' },
  { key: 'vlastnost', label: 'Vlastnost' },
  { key: 'modelova_rada', label: 'Modelová řada' },
  { key: 'znacka', label: 'Značka' },
  { key: 'externi_maska', label: 'Ext. maska' },
  { key: 'textovy_vzorec', label: 'Text. vzorec' },
  { key: 'technologie', label: 'Technologie' },
  { key: 'zastupny_text', label: 'Zást. text' },
]

function isOverdue(termin: string): boolean {
  if (!termin) return false
  return new Date(termin) < new Date()
}

export default function MdmWorkflowBlock({ data, highlightColor = 'blue' }: Props) {
  const [filterResitel, setFilterResitel] = useState('')
  const [filterTyp, setFilterTyp] = useState('')

  const resitele = useMemo(() =>
    Array.from(new Set(data.ukoly.map((u) => u.resitel))).sort((a, b) => a.localeCompare(b, 'cs')),
    [data.ukoly]
  )
  const typy = useMemo(() =>
    Array.from(new Set(data.ukoly.map((u) => u.typ))).sort(),
    [data.ukoly]
  )

  const filteredUkoly = useMemo(() => {
    let items = [...data.ukoly]
    if (filterResitel) items = items.filter((u) => u.resitel === filterResitel)
    if (filterTyp) items = items.filter((u) => u.typ === filterTyp)
    return items.sort((a, b) => {
      if (!a.termin && !b.termin) return 0
      if (!a.termin) return 1
      if (!b.termin) return -1
      return a.termin.localeCompare(b.termin)
    })
  }, [data.ukoly, filterResitel, filterTyp])

  const sumarizaceSorted = [...data.sumarizace].sort((a, b) => b.celkem - a.celkem)
  const totals = COL_LABELS.reduce<Record<string, number>>((acc, { key }) => {
    acc[key] = data.sumarizace.reduce((s, row) => s + ((row as unknown as Record<string, number>)[key] || 0), 0)
    return acc
  }, {})

  const cellCls = highlightColor === 'yellow'
    ? 'bg-yellow-50 font-semibold text-yellow-800'
    : 'bg-blue-50 font-semibold text-blue-700'

  return (
    <div className="space-y-5">
      {data.sumarizace.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Sumarizace dle řešitele</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">Řešitel</th>
                  {COL_LABELS.map(({ label }) => (
                    <th key={label} className="px-3 py-2 text-center whitespace-nowrap">{label}</th>
                  ))}
                  <th className="px-3 py-2 text-center font-bold">Celkem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sumarizaceSorted.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{row.resitel}</td>
                    {COL_LABELS.map(({ key }) => {
                      const v = (row as unknown as Record<string, number>)[key] || 0
                      return (
                        <td key={key} className={`px-3 py-2 text-center ${v > 0 ? cellCls : 'text-gray-300'}`}>
                          {v > 0 ? v : '—'}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-center font-bold text-gray-800">{row.celkem}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold text-xs">
                  <td className="px-3 py-2 uppercase tracking-wide text-gray-600">Celkem</td>
                  {COL_LABELS.map(({ key }) => (
                    <td key={key} className="px-3 py-2 text-center">{totals[key] || '—'}</td>
                  ))}
                  <td className="px-3 py-2 text-center text-blue-700">
                    {Object.values(totals).reduce((s, v) => s + v, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {data.ukoly.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Otevřené úkoly</h4>
          <div className="mb-3 flex gap-2 flex-wrap">
            <select
              value={filterResitel}
              onChange={(e) => setFilterResitel(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Všichni řešitelé</option>
              {resitele.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Všechny typy</option>
              {typy.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filterResitel || filterTyp) && (
              <button
                onClick={() => { setFilterResitel(''); setFilterTyp('') }}
                className="rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                Zrušit filtry
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Řešitel</th>
                  <th className="px-3 py-2">Typ</th>
                  <th className="px-3 py-2">Entita</th>
                  <th className="px-3 py-2">Zadavatel</th>
                  <th className="px-3 py-2">Termín</th>
                  <th className="px-3 py-2">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUkoly.map((ukol, i) => {
                  const overdue = isOverdue(ukol.termin)
                  return (
                    <tr key={i} className={overdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className={`px-3 py-2 font-mono text-xs ${overdue ? 'text-red-800' : ''}`}>
                        {ukol.id_url ? (
                          <a href={ukol.id_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {ukol.id}
                          </a>
                        ) : ukol.id}
                      </td>
                      <td className="px-3 py-2 font-medium">{ukol.resitel}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{ukol.typ}</td>
                      <td className="px-3 py-2">
                        {ukol.entita_url ? (
                          <a href={ukol.entita_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {ukol.entita}
                          </a>
                        ) : ukol.entita}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{ukol.zadavatel}</td>
                      <td className={`px-3 py-2 text-xs ${overdue ? 'font-semibold text-red-700' : 'text-gray-600'}`}>
                        {ukol.termin ? ukol.termin.replace(/T.*$/, '').split('-').reverse().join('.') : '—'}
                        {overdue && <span className="ml-1">⚠</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ukol.stav === 'inprogress' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {ukol.stav}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredUkoly.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">Žádné výsledky</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
