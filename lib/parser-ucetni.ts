import * as cheerio from 'cheerio'
import type {
  Report, ReportKPI, ReportSections,
  UcSec1, UcSec1Item,
  UcSec2, UcSec2Mena,
  UcSec3, UcSec3Prijemka,
  UcSec4,
} from '@/types/report'

// ---------------------------------------------------------------------------
// HTML → lines
// ---------------------------------------------------------------------------

function htmlToLines(html: string): string[] {
  const $ = cheerio.load(html)

  // Tables: preserve pipe-separated structure
  $('table').each((_, table) => {
    const rows: string[] = []
    $(table).find('tr').each((_, tr) => {
      const cells: string[] = []
      $(tr).find('td, th').each((_, td) => { cells.push($(td).text().trim()) })
      if (cells.length) rows.push(cells.join(' | '))
    })
    $(table).replaceWith(rows.join('\n'))
  })

  $('br').replaceWith('\n')
  $('p, div, li').each((_, el) => { $(el).after('\n') })
  $('h1, h2, h3, h4, h5, h6').each((_, el) => { $(el).after('\n') })

  return $('body').text()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

function parseAmount(s: string): number {
  // "14 500 016.70" — spaces as thousands separator, period as decimal
  return parseFloat(s.trim().replace(/\s/g, '')) || 0
}

// ---------------------------------------------------------------------------
// Section splitting
// ---------------------------------------------------------------------------

interface UcetniChunks {
  sec1: string[]
  sec2: string[]
  sec3: string[]  // contains both nevykryté and nadměrně subsections
  sec4: string[]
}

function splitSections(lines: string[]): UcetniChunks {
  const chunks: UcetniChunks = { sec1: [], sec2: [], sec3: [], sec4: [] }
  type K = keyof UcetniChunks | null
  let current: K = null

  for (const line of lines) {
    const t = line.trim()

    if (/objem nevykrytých/i.test(t)) {
      current = 'sec1'
      chunks.sec1.push(line)
      continue
    }
    if (/^celkem přijatých faktur:/i.test(t)) {
      current = 'sec2'
      chunks.sec2.push(line)
      continue
    }
    if (/seznam (ne|nadměrně )?vykrytých příjemek/i.test(t)) {
      current = 'sec3'
      chunks.sec3.push(line)
      continue
    }
    if (/zásoby.*limit|limit.*autoobjednání|autoobjednání/i.test(t)) {
      current = 'sec4'
      continue
    }

    if (current) chunks[current].push(line)
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Section 1: Nedoručené zboží
// ---------------------------------------------------------------------------

function parseUcSec1(lines: string[]): UcSec1 | undefined {
  if (!lines.length) return undefined

  const closedMap = new Map<string, number>()
  const inprocessMap = new Map<string, number>()
  let phase: 'closed' | 'inprocess' | null = null

  for (const line of lines) {
    const t = line.trim()

    if (/\bclosed\b/i.test(t)) { phase = 'closed' }
    if (/\binprocess\b/i.test(t)) { phase = 'inprocess' }
    if (!phase) continue

    // "MAXXWIN NUTRITION: 1 ks" — greedy to handle colons in supplier names
    const m = /^(.+):\s*(\d+)\s*ks$/i.exec(t)
    if (!m) continue
    const dodavatel = m[1].trim()
    if (/objem nevykrytých|closed|inprocess/i.test(dodavatel)) continue
    const ks = parseInt(m[2])
    if (phase === 'closed') closedMap.set(dodavatel, (closedMap.get(dodavatel) || 0) + ks)
    else inprocessMap.set(dodavatel, (inprocessMap.get(dodavatel) || 0) + ks)
  }

  const allDodavatele = Array.from(new Set([
    ...Array.from(closedMap.keys()),
    ...Array.from(inprocessMap.keys()),
  ]))
  const items: UcSec1Item[] = allDodavatele.map((d) => ({
    dodavatel: d,
    ks_closed: closedMap.get(d) || 0,
    ks_inprocess: inprocessMap.get(d) || 0,
  }))

  const ks_closed = Array.from(closedMap.values()).reduce((s, n) => s + n, 0)
  const ks_inprocess = Array.from(inprocessMap.values()).reduce((s, n) => s + n, 0)

  return { total_ks: ks_closed + ks_inprocess, ks_closed, ks_inprocess, items }
}

// ---------------------------------------------------------------------------
// Section 2: Faktury přijaté
// ---------------------------------------------------------------------------

function parseUcSec2(lines: string[]): UcSec2 | undefined {
  if (!lines.length) return undefined

  let total = 0
  let po_splatnosti = 0
  const meny: UcSec2Mena[] = []
  const meny_po_splatnosti: UcSec2Mena[] = []
  const faktury_po_splatnosti: { id: string; url?: string }[] = []
  let poznamka: string | undefined
  let phase: 'regular' | 'overdue' = 'regular'

  for (const line of lines) {
    const t = line.trim()

    // "Celkem přijatých faktur: 152"
    const celkemM = /^Celkem přijatých faktur:\s*(\d+)/i.exec(t)
    if (celkemM) { total = parseInt(celkemM[1]); continue }

    // "Suma pro CZK: 14 500 016.70 (počet faktur: 74)"
    const sumaM = /^Suma pro (\w+):\s*([\d\s.]+)\s*\(počet faktur:\s*(\d+)\)/i.exec(t)
    if (sumaM) {
      const entry: UcSec2Mena = {
        mena: sumaM[1].toUpperCase(),
        suma: parseAmount(sumaM[2]),
        pocet: parseInt(sumaM[3]),
      }
      if (phase === 'regular') meny.push(entry)
      else meny_po_splatnosti.push(entry)
      continue
    }

    // "Z toho po splatnosti: 3"
    const splatnostM = /^Z toho po splatnosti:\s*(\d+)/i.exec(t)
    if (splatnostM) { po_splatnosti = parseInt(splatnostM[1]); phase = 'overdue'; continue }

    // Bullet invoice in overdue phase: "• [26EU00962](url)" or "- [26EU00962](url)"
    if (phase === 'overdue') {
      const bulletM = /[•\-\*]\s*\[([^\]]+)\]\(([^)]+)\)/.exec(t)
      if (bulletM) {
        faktury_po_splatnosti.push({ id: bulletM[1], url: bulletM[2] })
        continue
      }
      // Plain ID fallback: "• 26EU00962"
      const plainM = /[•\-\*]\s*([A-Z0-9]+)\s*$/.exec(t)
      if (plainM) {
        faktury_po_splatnosti.push({ id: plainM[1] })
        continue
      }
    }

    // "Seznam neodsouhlasených..." — poznamka
    if (/neodsouhlasených|pro zpracování u účetní/i.test(t)) {
      poznamka = t
    }
  }

  if (!total) total = meny.reduce((s, m) => s + m.pocet, 0)

  return { total, po_splatnosti, meny, meny_po_splatnosti, faktury_po_splatnosti, poznamka }
}

// ---------------------------------------------------------------------------
// Section 3: Vykrytí příjemek (nevykryté + nadměrně vykryté)
// ---------------------------------------------------------------------------

function parseUcSec3(lines: string[]): UcSec3 | undefined {
  if (!lines.length) return undefined

  let nevykryte_count = 0
  let nadmerne_count = 0
  let currentDodavatel = '-'
  const prijemky: UcSec3Prijemka[] = []

  for (const line of lines) {
    const t = line.trim()

    // Section header "Seznam nevykrytých příjemek - celkem 203"
    const nevM = /seznam nevykrytých příjemek\s*[-–]\s*celkem\s+(\d+)/i.exec(t)
    if (nevM) { nevykryte_count = parseInt(nevM[1]); continue }

    // Sub-section header "Seznam nadměrně vykrytých příjemek - celkem 4"
    const nadM = /seznam nadměrně vykrytých příjemek\s*[-–]\s*celkem\s+(\d+)/i.exec(t)
    if (nadM) { nadmerne_count = parseInt(nadM[1]); continue }

    // "Dodavatel: NAME"
    const dodM = /^Dodavatel:\s*(.+)/i.exec(t)
    if (dodM) { currentDodavatel = dodM[1].trim(); continue }

    // "[26SP05865](url) (02.06.2026) nevykryto 182 ks" or "... nevykryto 510 ks (700 ks)"
    const prijemkaM =
      /^\[([^\]]+)\]\(([^)]+)\)\s*\((\d{2})\.(\d{2})\.(\d{4})\)\s*nevykryto\s+(-?\d+)\s*ks(?:\s*\((\d+)\s*ks\))?/i.exec(t)
    if (prijemkaM) {
      prijemky.push({
        id: prijemkaM[1].trim(),
        url: prijemkaM[2].trim(),
        datum: `${prijemkaM[5]}-${prijemkaM[4]}-${prijemkaM[3]}`,
        nevykryto: parseInt(prijemkaM[6]),
        celkem: prijemkaM[7] ? parseInt(prijemkaM[7]) : undefined,
        dodavatel: currentDodavatel,
      })
      continue
    }

    // Plain ID fallback (no markdown link): "25PRP00076 (03.01.2025) nevykryto 1 ks"
    const plainM =
      /^([A-Z0-9]+)\s*\((\d{2})\.(\d{2})\.(\d{4})\)\s*nevykryto\s+(-?\d+)\s*ks(?:\s*\((\d+)\s*ks\))?/i.exec(t)
    if (plainM) {
      prijemky.push({
        id: plainM[1].trim(),
        datum: `${plainM[4]}-${plainM[3]}-${plainM[2]}`,
        nevykryto: parseInt(plainM[5]),
        celkem: plainM[6] ? parseInt(plainM[6]) : undefined,
        dodavatel: currentDodavatel,
      })
    }
  }

  const nevykryte_ks = prijemky
    .filter((p) => p.nevykryto > 0)
    .reduce((s, p) => s + p.nevykryto, 0)

  if (!nevykryte_count) nevykryte_count = prijemky.filter((p) => p.nevykryto > 0).length
  if (!nadmerne_count) nadmerne_count = prijemky.filter((p) => p.nevykryto < 0).length

  return { nevykryte_count, nevykryte_ks, nadmerne_count, prijemky }
}

// ---------------------------------------------------------------------------
// Section 4: Zásoby přes limit (same structure as Section10)
// ---------------------------------------------------------------------------

function parseUcSec4(lines: string[]): UcSec4 | undefined {
  if (!lines.length) return undefined

  const items: UcSec4['items'] = []
  let inTable = false

  for (const line of lines) {
    if (!line.includes('|')) continue
    const parts = line.split('|').map((s) => s.trim())

    // Header row
    if (/dodavatel/i.test(parts[0]) && parts.length >= 4) {
      inTable = true
      continue
    }
    if (/^-+$/.test(parts[0])) continue
    if (!inTable || parts.length < 4) continue

    items.push({
      dodavatel: parts[0] || '',
      kod: parts[1] || '',
      nazev: parts[2] || '',
      skupina: parts[3] || '',
      admin: parts[4] || '',
      ks: parseInt(parts[5]) || 0,
      oz_cislo: parts[6] || '',
      termin: parts[7] || '',
      level: parts[8] || '',
    })
  }

  if (!items.length) return undefined

  const terminySet = new Set(items.map((i) => i.termin).filter(Boolean))
  return {
    celkem: items.reduce((s, i) => s + i.ks, 0),
    terminy: Array.from(terminySet).sort(),
    items,
  }
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

function computeUcetniKPI(sections: ReportSections): ReportKPI {
  return {
    sec1_count: 0, sec4_count: 0, sec14_count: 0, sec13_count: 0, sec9_terms: 0,
    uc_sec1_count: sections.uc_sec1?.total_ks ?? 0,
    uc_sec2_count: sections.uc_sec2?.total ?? 0,
    uc_sec2b_count: sections.uc_sec2?.po_splatnosti ?? 0,
    uc_sec3a_count: sections.uc_sec3?.nevykryte_count ?? 0,
    uc_sec3b_count: sections.uc_sec3?.nevykryte_ks ?? 0,
    uc_sec3c_count: sections.uc_sec3?.nadmerne_count ?? 0,
    uc_sec4_count: sections.uc_sec4?.items.length ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseUcetniEmail(html: string, date: string, fetchedAt: string): Report {
  const lines = htmlToLines(html)
  const chunks = splitSections(lines)

  const sections: ReportSections = {}

  try { sections.uc_sec1 = parseUcSec1(chunks.sec1) } catch (e) { console.error('uc_sec1', e) }
  try { sections.uc_sec2 = parseUcSec2(chunks.sec2) } catch (e) { console.error('uc_sec2', e) }
  try { sections.uc_sec3 = parseUcSec3(chunks.sec3) } catch (e) { console.error('uc_sec3', e) }
  try { sections.uc_sec4 = parseUcSec4(chunks.sec4) } catch (e) { console.error('uc_sec4', e) }

  return {
    date,
    reportType: 'ucetni',
    fetchedAt,
    kpi: computeUcetniKPI(sections),
    sections,
  }
}
