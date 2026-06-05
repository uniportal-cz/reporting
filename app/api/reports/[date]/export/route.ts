import { NextResponse } from 'next/server'
import { loadReport } from '@/lib/storage'
import Papa from 'papaparse'
import type { Report, MarzeProduct } from '@/types/report'

export const runtime = 'nodejs'

function sectionToCsv(report: Report, section: string): string {
  const s = report.sections

  switch (section) {
    case '5': {
      const items = s.sec5?.items ?? []
      return Papa.unparse(items.map((i) => ({ Kód: i.kod, Typ: i.typ, Název: i.nazev, Skupina: i.skupina, Admin: i.admin })))
    }
    case '6': {
      const items = s.sec6?.items ?? []
      return Papa.unparse(items.map((i) => ({ 'UN kód': i.un_kod, Počet: i.pocet })))
    }
    case '8': {
      const rows: Record<string, string | number>[] = []
      for (const strom of s.sec8?.stromy ?? []) {
        for (const kat of strom.kategorie) {
          rows.push({ Strom: strom.nazev, Kategorie: kat.nazev, Pravidel: kat.pocet_pravidel, 'Produktů mimo': kat.produktu_mimo })
        }
      }
      return Papa.unparse(rows)
    }
    case '10': {
      const items = s.sec10?.items ?? []
      return Papa.unparse(items.map((i) => ({
        Dodavatel: i.dodavatel, Kód: i.kod, Název: i.nazev, Skupina: i.skupina, Admin: i.admin,
        Ks: i.ks, 'OZ číslo': i.oz_cislo, Termín: i.termin, Level: i.level,
      })))
    }
    case '1': {
      const items = s.sec1?.sample ?? []
      return Papa.unparse(
        items.map((i) => ({
          ID: i.id,
          Typ: i.typ,
          Název: i.nazev,
          'Skupina ID': i.skupina_id,
          Skupina: i.skupina_nazev,
          Admin: i.admin,
        }))
      )
    }
    case '2': {
      const items = s.sec2?.sample ?? []
      return Papa.unparse(
        items.map((i) => ({ Dodavatel: i.dodavatel, Kód: i.kod, Název: i.nazev, Skupina: i.skupina, Admin: i.admin, Skladem: i.skladem }))
      )
    }
    case '3': {
      const items = s.sec3?.sample ?? []
      return Papa.unparse(items.map((i) => ({ ID: i.id, Název: i.nazev, Ceník: i.cenik, 'Skupina ID': i.skupina_id, Skupina: i.skupina_nazev, Admin: i.admin })))
    }
    case '4': {
      const items = s.sec4?.products ?? []
      return Papa.unparse(
        items.map((p) => ({
          ID: p.id,
          Typ: p.typ,
          Název: p.nazev,
          Skupina: p.skupina,
          Admin: p.admin,
          Země: p.countries.join(', '),
        }))
      )
    }
    case '7': {
      const items = s.sec7?.items ?? []
      return Papa.unparse(items.map((i) => ({ Kód: i.kod, Typ: i.typ, Název: i.nazev, Skupina: i.skupina, Admin: i.admin, Skladem: i.skladem })))
    }
    case '9': {
      const items = s.sec9?.items ?? []
      return Papa.unparse(
        items.map((i) => ({
          Dodavatel: i.dodavatel,
          Kód: i.kod,
          Název: i.nazev,
          Skupina: i.skupina,
          Admin: i.admin,
          Ks: i.ks,
          'OZ číslo': i.oz_cislo,
          Termín: i.termin,
          Level: i.level,
        }))
      )
    }
    case '11': {
      const items = s.sec11?.items ?? []
      return Papa.unparse(items.map((i) => ({ 'Skupina ID': i.skupina_id, Skupina: i.skupina_nazev, Admin: i.admin, Počet: i.pocet })))
    }
    case '12': {
      const skupiny = s.sec12?.skupiny ?? []
      return Papa.unparse(skupiny.map((sk) => ({ Skupina: sk.nazev, Počet: sk.pocet })))
    }
    case '13': {
      const items = s.sec13?.items ?? []
      return Papa.unparse(items.map((i) => ({ Kód: i.kod, Název: i.nazev, Skupina: i.skupina, Admin: i.admin })))
    }
    case '14': {
      const rows: Record<string, string | number>[] = []
      for (const sg of s.sec14?.skupiny ?? []) {
        for (const p of sg.produkty) {
          rows.push({
            Skupina: sg.skupina,
            Kód: p.kod,
            Název: p.nazev,
            'Marže CZ': p.marze_CZ,
            'Marže IT': p.marze_IT,
            'Marže CH': p.marze_CH,
            'Marže WEU': p.marze_WEU,
            'Marže SK': p.marze_SK,
            'Marže PL': p.marze_PL,
            'Marže GB': p.marze_GB,
            'Marže DEAT': p.marze_DEAT,
            Skladem: p.skladem,
          })
        }
      }
      return Papa.unparse(rows)
    }
    case '15': {
      const kategorie = s.sec15?.kategorie ?? []
      return Papa.unparse(kategorie.map((k) => ({ Kategorie: k.nazev, Pravidel: k.pocet_pravidel, 'Produktů mimo': k.produktu_mimo })))
    }
    default:
      return ''
  }
}

export async function GET(
  req: Request,
  { params }: { params: { date: string } }
) {
  const { date } = params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  const url = new URL(req.url)
  const section = url.searchParams.get('section') || ''

  const report = await loadReport(date)
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const csv = sectionToCsv(report, section)
  if (!csv) {
    return NextResponse.json({ error: 'Section not found or has no data' }, { status: 404 })
  }

  const filename = `report-${date}-sec${section}.csv`
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
