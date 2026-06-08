'use client'

import { UcSec2 as UcSec2Type } from '@/types/report'

interface Props { data: UcSec2Type; date: string }

const MENA_SYMBOLS: Record<string, string> = {
  CZK: 'Kč', EUR: '€', USD: '$', GBP: '£', CAD: 'CAD', CHF: 'CHF', PLN: 'PLN',
}

function formatAmount(value: number, mena: string): string {
  const formatted = new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  const sym = MENA_SYMBOLS[mena] || mena
  return mena === 'CZK' ? `${formatted} ${sym}` : `${formatted} ${sym}`
}

export default function UcSec2({ data }: Props) {
  // Build overdue counts per currency
  const overduePocet: Record<string, number> = {}
  for (const m of data.meny_po_splatnosti) overduePocet[m.mena] = m.pocet

  return (
    <div className="space-y-4">
      {/* Currency table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Měna</th>
              <th className="px-3 py-2 text-right">Suma</th>
              <th className="px-3 py-2 text-right">Počet faktur</th>
              <th className="px-3 py-2 text-right">Po splatnosti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.meny.map((m, i) => {
              const overdue = overduePocet[m.mena]
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold">{m.mena}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{formatAmount(m.suma, m.mena)}</td>
                  <td className="px-3 py-2 text-right font-medium">{m.pocet}</td>
                  <td className="px-3 py-2 text-right">
                    {overdue ? (
                      <span className="font-semibold text-red-700">{overdue}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
              <td className="px-3 py-2">Celkem</td>
              <td className="px-3 py-2 text-right text-gray-400 text-xs">—</td>
              <td className="px-3 py-2 text-right">{data.total}</td>
              <td className="px-3 py-2 text-right">
                {data.po_splatnosti > 0 ? (
                  <span className="text-red-700">{data.po_splatnosti}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Overdue invoices */}
      {data.po_splatnosti > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-red-800">
            {data.po_splatnosti} {data.po_splatnosti === 1 ? 'faktura' : data.po_splatnosti < 5 ? 'faktury' : 'faktur'} po splatnosti — nutno zpracovat u účetní
          </p>
          {data.faktury_po_splatnosti.length > 0 && (
            <ul className="space-y-1">
              {data.faktury_po_splatnosti.map((f, i) => (
                <li key={i} className="text-sm">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-red-700 hover:underline font-mono">
                      {f.id}
                    </a>
                  ) : (
                    <span className="font-mono text-red-700">{f.id}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Poznamka */}
      {data.poznamka && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
          {data.poznamka}
        </div>
      )}
    </div>
  )
}
