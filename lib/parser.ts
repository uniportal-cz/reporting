import * as cheerio from 'cheerio'
import type { CheerioAPI, Cheerio } from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import {
  Report,
  ReportSections,
  ReportKPI,
  Section1,
  Section2,
  Section3,
  Section4,
  Section7,
  Section9,
  Section11,
  Section12,
  Section13,
  Section14,
  Section15,
  MarzeProduct,
} from '@/types/report'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCount(text: string): number {
  const m = /\((\d+)\)/.exec(text)
  if (m) return parseInt(m[1], 10)
  const n = /:\s*(\d+)/.exec(text)
  if (n) return parseInt(n[1], 10)
  return 0
}

function parseNum(s: string): number {
  if (!s) return 0
  const clean = s.replace(/[^\d.,\-]/g, '').replace(',', '.')
  const v = parseFloat(clean)
  return isNaN(v) ? 0 : v
}

/** Find a heading element whose text matches at least one of the given patterns */
function findHeading(
  $: CheerioAPI,
  patterns: (string | RegExp)[]
): Cheerio<AnyNode> | null {
  let found: Cheerio<AnyNode> | null = null
  $('h1, h2, h3, h4, h5, strong, b, td[colspan], th').each((_, el) => {
    if (found) return false
    const text = $(el).text().trim()
    const matches = patterns.some((p) =>
      typeof p === 'string' ? text.toLowerCase().includes(p.toLowerCase()) : p.test(text)
    )
    if (matches) {
      found = $(el) as Cheerio<AnyNode>
      return false
    }
  })
  return found
}

/** Collect sibling content elements after a heading until the next same-level heading */
function collectSectionContent($: CheerioAPI, heading: Cheerio<AnyNode>): Cheerio<AnyNode>[] {
  const result: Cheerio<AnyNode>[] = []
  const tagName = (heading[0] as Element).tagName?.toLowerCase() || 'h2'
  const headingLevel = parseInt(tagName.replace(/\D/g, '') || '2', 10)

  let el = heading.next()
  for (let i = 0; i < 100; i++) {
    if (!el || el.length === 0) break
    const t = (el[0] as Element)?.tagName?.toLowerCase()
    if (t && /^h[1-6]$/.test(t)) {
      const lvl = parseInt(t[1], 10)
      if (lvl <= headingLevel) break
    }
    result.push(el as Cheerio<AnyNode>)
    el = el.next()
  }
  return result
}

/** Parse a generic HTML table into array of row-objects keyed by header */
function parseTable($: CheerioAPI, tableEl: Cheerio<AnyNode>): Record<string, string>[] {
  const headers: string[] = []
  tableEl.find('thead tr th, thead tr td').each((_, th) => {
    headers.push($(th).text().trim())
  })
  if (headers.length === 0) {
    // try first tr as header
    tableEl.find('tr').first().find('th, td').each((_, th) => {
      headers.push($(th).text().trim())
    })
  }

  const rows: Record<string, string>[] = []
  tableEl.find('tbody tr, tr').each((rowIdx, tr) => {
    const cells: string[] = []
    $(tr).find('td, th').each((_, td) => {
      cells.push($(td).text().trim())
    })
    if (cells.length === 0) return
    // skip header row
    if (rowIdx === 0 && headers.length > 0 && cells[0] === headers[0]) return
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    // also store by index for headerless fallback
    cells.forEach((c, i) => {
      if (!row[i.toString()]) row[i.toString()] = c
    })
    rows.push(row)
  })
  return rows
}

/** Find the nearest table in a set of content elements */
function findTable($: CheerioAPI, elements: Cheerio<AnyNode>[]): Cheerio<AnyNode> | null {
  for (const el of elements) {
    const tag = (el[0] as Element)?.tagName?.toLowerCase()
    if (tag === 'table') return el
    const inner = el.find('table').first()
    if (inner.length) return inner
  }
  return null
}

/** Find all tables */
function findTables($: CheerioAPI, elements: Cheerio<AnyNode>[]): Cheerio<AnyNode>[] {
  const tables: Cheerio<AnyNode>[] = []
  for (const el of elements) {
    const tag = (el[0] as Element)?.tagName?.toLowerCase()
    if (tag === 'table') tables.push(el)
    el.find('table').each((_, t) => { tables.push($(t) as Cheerio<AnyNode>) })
  }
  return tables
}

/** Find list items in content elements */
function findListItems($: CheerioAPI, elements: Cheerio<AnyNode>[]): string[] {
  const items: string[] = []
  for (const el of elements) {
    el.find('li').each((_, li) => { items.push($(li).text().trim()) })
    const tag = (el[0] as Element)?.tagName?.toLowerCase()
    if (tag === 'li') items.push(el.text().trim())
  }
  return items
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

function parseSection1($: CheerioAPI): Section1 | undefined {
  try {
    const heading = findHeading($, [
      /1[\.\)]\s*(zapnut|doprodej)/i,
      'zapnutý produkt v doprodeji',
      'zapnutý v doprodeji',
    ])
    if (!heading) return undefined

    const headingText = heading.text()
    const count = extractCount(headingText)
    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) return { count, items: [] }

    const rows = parseTable($, table)
    const items = rows.map((r) => ({
      id: r['ID'] || r['Kód'] || r['kod'] || r['0'] || '',
      typ: r['Typ'] || r['typ'] || r['1'] || '',
      nazev: r['Název'] || r['nazev'] || r['Produkt'] || r['2'] || '',
      skupina_id: r['Skupina ID'] || r['skupina_id'] || r['3'] || '',
      skupina_nazev: r['Skupina'] || r['skupina_nazev'] || r['4'] || '',
      odpovedna_osoba: r['Odpovědná osoba'] || r['odpovedna_osoba'] || r['Admin'] || r['5'] || '',
    }))

    return { count: count || items.length, items }
  } catch (e) {
    console.error('parseSection1 error:', e)
    return undefined
  }
}

function parseSection2($: CheerioAPI): Section2 | undefined {
  try {
    const heading = findHeading($, [
      /2[\.\)]\s*(saleable|dodavatel)/i,
      'saleable bez dodavatelského',
      'bez dodavatelského skladu',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const tables = findTables($, content)

    if (tables.length === 0) {
      // try to parse single table
      const table = findTable($, content)
      if (!table) return { dodavatele: [] }
      const rows = parseTable($, table)
      const byDodavatel: Record<string, { kod: string; nazev: string; skupina: string; admin: string; skladem: number }[]> = {}
      for (const r of rows) {
        const d = r['Dodavatel'] || r['dodavatel'] || r['0'] || 'Neznámý'
        if (!byDodavatel[d]) byDodavatel[d] = []
        byDodavatel[d].push({
          kod: r['Kód'] || r['kod'] || r['1'] || '',
          nazev: r['Název'] || r['2'] || '',
          skupina: r['Skupina'] || r['3'] || '',
          admin: r['Admin'] || r['4'] || '',
          skladem: parseNum(r['Skladem'] || r['5'] || '0'),
        })
      }
      return {
        dodavatele: Object.entries(byDodavatel).map(([dodavatel, produkty]) => ({ dodavatel, produkty })),
      }
    }

    // Multiple tables — each table is a supplier
    const dodavatele = tables.map((t, i) => {
      const dodavatel = t.prev('h3, h4, b, strong, p').text().trim() || `Dodavatel ${i + 1}`
      const rows = parseTable($, t)
      const produkty = rows.map((r) => ({
        kod: r['Kód'] || r['kod'] || r['0'] || '',
        nazev: r['Název'] || r['1'] || '',
        skupina: r['Skupina'] || r['2'] || '',
        admin: r['Admin'] || r['3'] || '',
        skladem: parseNum(r['Skladem'] || r['4'] || '0'),
      }))
      return { dodavatel, produkty }
    })

    return { dodavatele }
  } catch (e) {
    console.error('parseSection2 error:', e)
    return undefined
  }
}

function parseSection3($: CheerioAPI): Section3 | undefined {
  try {
    const heading = findHeading($, [
      /3[\.\)]\s*(withvariant|variant|rozdíln)/i,
      'withvariant s rozdílnou',
      'rozdílnou cenou',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) return { items: [] }

    const rows = parseTable($, table)
    const items = rows.map((r) => ({
      id: r['ID'] || r['Kód'] || r['0'] || '',
      nazev: r['Název'] || r['1'] || '',
      cenik: r['Ceník'] || r['Cena'] || r['2'] || '',
      skupina: r['Skupina'] || r['3'] || '',
      admin: r['Admin'] || r['4'] || '',
    }))

    return { items }
  } catch (e) {
    console.error('parseSection3 error:', e)
    return undefined
  }
}

function parseSection4($: CheerioAPI): Section4 | undefined {
  try {
    const heading = findHeading($, [
      /4[\.\)]\s*(nelze|doručit)/i,
      'nelze doručit',
    ])
    if (!heading) return undefined

    const headingText = heading.text()
    const content = collectSectionContent($, heading)
    const tables = findTables($, content)

    if (tables.length === 0) {
      // single table with country column
      const table = findTable($, content)
      if (!table) return { zeme: [] }
      const rows = parseTable($, table)
      const byZeme: Record<string, { id: string; typ: string; nazev: string; skupina: string; admin: string }[]> = {}
      for (const r of rows) {
        const z = r['Země'] || r['zeme'] || r['Country'] || r['0'] || 'Neznámá'
        if (!byZeme[z]) byZeme[z] = []
        byZeme[z].push({
          id: r['ID'] || r['Kód'] || r['1'] || '',
          typ: r['Typ'] || r['2'] || '',
          nazev: r['Název'] || r['3'] || '',
          skupina: r['Skupina'] || r['4'] || '',
          admin: r['Admin'] || r['5'] || '',
        })
      }
      return {
        zeme: Object.entries(byZeme).map(([zeme, produkty]) => ({ zeme, produkty })),
      }
    }

    // Tables per country
    const zeme = tables.map((t, i) => {
      const zemeEl = t.prev('h3, h4, b, strong, p')
      const zemeText = zemeEl.text().trim() || extractCount(headingText).toString() || `Země ${i + 1}`
      const rows = parseTable($, t)
      const produkty = rows.map((r) => ({
        id: r['ID'] || r['Kód'] || r['0'] || '',
        typ: r['Typ'] || r['1'] || '',
        nazev: r['Název'] || r['2'] || '',
        skupina: r['Skupina'] || r['3'] || '',
        admin: r['Admin'] || r['4'] || '',
      }))
      return { zeme: zemeText, produkty }
    })

    return { zeme }
  } catch (e) {
    console.error('parseSection4 error:', e)
    return undefined
  }
}

function parseSection7($: CheerioAPI): Section7 | undefined {
  try {
    const heading = findHeading($, [
      /7[\.\)]\s*(dárek|darek|není skladem)/i,
      'dárek není skladem',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) return { items: [] }

    const rows = parseTable($, table)
    const items = rows.map((r) => ({
      kod: r['Kód'] || r['kod'] || r['0'] || '',
      typ: r['Typ'] || r['1'] || '',
      nazev: r['Název'] || r['2'] || '',
      skupina: r['Skupina'] || r['3'] || '',
      admin: r['Admin'] || r['4'] || '',
      skladem: parseNum(r['Skladem'] || r['5'] || '0'),
    }))

    return { items }
  } catch (e) {
    console.error('parseSection7 error:', e)
    return undefined
  }
}

function parseSection9($: CheerioAPI): Section9 | undefined {
  try {
    const heading = findHeading($, [
      /9[\.\)]\s*(likvidac|objednán)/i,
      'objednány k likvidaci',
      'k likvidaci',
    ])
    if (!heading) return undefined

    const headingText = heading.text()
    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) return { celkem: 0, terminy: [], items: [] }

    const rows = parseTable($, table)
    const items = rows.map((r) => ({
      dodavatel: r['Dodavatel'] || r['0'] || '',
      kod: r['Kód'] || r['kod'] || r['1'] || '',
      nazev: r['Název'] || r['2'] || '',
      skupina: r['Skupina'] || r['3'] || '',
      admin: r['Admin'] || r['4'] || '',
      ks: parseNum(r['Ks'] || r['Množství'] || r['5'] || '0'),
      oz_cislo: r['OZ'] || r['Číslo OZ'] || r['6'] || '',
      termin: r['Termín'] || r['Datum'] || r['7'] || '',
      level: r['Level'] || r['Úroveň'] || r['8'] || '',
    }))

    const terminySet = new Set(items.map((i) => i.termin).filter(Boolean))
    const terminy = Array.from(terminySet).sort()

    return {
      celkem: items.reduce((sum, i) => sum + i.ks, 0),
      terminy,
      items,
    }
  } catch (e) {
    console.error('parseSection9 error:', e)
    return undefined
  }
}

function parseSection11($: CheerioAPI): Section11 | undefined {
  try {
    const heading = findHeading($, [
      /11[\.\)]\s*(mimo saleable|saleable)/i,
      'mimo saleable',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) return { items: [], celkem: 0 }

    const rows = parseTable($, table)
    const items = rows.map((r) => ({
      skupina_id: r['Skupina ID'] || r['skupina_id'] || r['0'] || '',
      skupina_nazev: r['Skupina'] || r['skupina_nazev'] || r['1'] || '',
      admin: r['Admin'] || r['2'] || '',
      pocet: parseNum(r['Počet'] || r['pocet'] || r['3'] || '0'),
    }))

    const celkem = items.reduce((sum, i) => sum + i.pocet, 0)
    return { items, celkem }
  } catch (e) {
    console.error('parseSection11 error:', e)
    return undefined
  }
}

function parseSection12($: CheerioAPI): Section12 | undefined {
  try {
    const heading = findHeading($, [
      /12[\.\)]\s*(nezadan|rozměr)/i,
      'nezadané rozměry',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) return { celkem_produktu: 0, pocet_terminu_oz: 0, skupiny: [] }

    const rows = parseTable($, table)
    const skupiny = rows.map((r) => ({
      nazev: r['Název'] || r['Skupina'] || r['0'] || '',
      pocet: parseNum(r['Počet'] || r['1'] || '0'),
    }))

    const celkem_produktu = skupiny.reduce((sum, s) => sum + s.pocet, 0)

    // Try to parse pocet_terminu_oz from a summary row or heading text
    let pocet_terminu_oz = 0
    const summaryText = content.map((el) => el.text()).join(' ')
    const termMatch = /termín[ů\s]+OZ[:\s]+(\d+)/i.exec(summaryText)
    if (termMatch) pocet_terminu_oz = parseInt(termMatch[1], 10)

    return { celkem_produktu, pocet_terminu_oz, skupiny }
  } catch (e) {
    console.error('parseSection12 error:', e)
    return undefined
  }
}

function parseSection13($: CheerioAPI): Section13 | undefined {
  try {
    const heading = findHeading($, [
      /13[\.\)]\s*(saleable bez kategorie|bez kategorie)/i,
      'saleable bez kategorie',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) {
      // try list items
      const listItems = findListItems($, content)
      return { items: listItems.map((li) => ({ kod: '', nazev: li, skupina: '', admin: '' })) }
    }

    const rows = parseTable($, table)
    const items = rows.map((r) => ({
      kod: r['Kód'] || r['kod'] || r['0'] || '',
      nazev: r['Název'] || r['1'] || '',
      skupina: r['Skupina'] || r['2'] || '',
      admin: r['Admin'] || r['3'] || '',
    }))

    return { items }
  } catch (e) {
    console.error('parseSection13 error:', e)
    return undefined
  }
}

function parseSection14($: CheerioAPI): Section14 | undefined {
  try {
    const heading = findHeading($, [
      /14[\.\)]\s*(záporná|zaporna|marže)/i,
      'záporná marže',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const tables = findTables($, content)

    if (tables.length === 0) return { skupiny: [] }

    if (tables.length === 1) {
      // Single table with skupina column
      const rows = parseTable($, tables[0])
      const bySkupina: Record<string, MarzeProduct[]> = {}
      for (const r of rows) {
        const skupina = r['Skupina'] || r['skupina'] || r['0'] || 'Ostatní'
        if (!bySkupina[skupina]) bySkupina[skupina] = []
        bySkupina[skupina].push({
          kod: r['Kód'] || r['1'] || '',
          nazev: r['Název'] || r['2'] || '',
          marze_CZ: parseNum(r['CZ'] || r['Marže CZ'] || r['3'] || '0'),
          marze_IT: parseNum(r['IT'] || r['Marže IT'] || r['4'] || '0'),
          marze_CH: parseNum(r['CH'] || r['Marže CH'] || r['5'] || '0'),
          marze_WEU: parseNum(r['WEU'] || r['Marže WEU'] || r['6'] || '0'),
          marze_SK: parseNum(r['SK'] || r['Marže SK'] || r['7'] || '0'),
          marze_PL: parseNum(r['PL'] || r['Marže PL'] || r['8'] || '0'),
          marze_GB: parseNum(r['GB'] || r['Marže GB'] || r['9'] || '0'),
          marze_DEAT: parseNum(r['DEAT'] || r['DE/AT'] || r['10'] || '0'),
          skladem: parseNum(r['Skladem'] || r['11'] || '0'),
        })
      }
      return {
        skupiny: Object.entries(bySkupina).map(([skupina, produkty]) => ({ skupina, produkty })),
      }
    }

    // Multiple tables per skupin
    const skupiny = tables.map((t, i) => {
      const prevEl = t.prev('h3, h4, b, strong, p')
      const skupina = prevEl.text().trim() || `Skupina ${i + 1}`
      const rows = parseTable($, t)
      const produkty: MarzeProduct[] = rows.map((r) => ({
        kod: r['Kód'] || r['0'] || '',
        nazev: r['Název'] || r['1'] || '',
        marze_CZ: parseNum(r['CZ'] || r['Marže CZ'] || r['2'] || '0'),
        marze_IT: parseNum(r['IT'] || r['Marže IT'] || r['3'] || '0'),
        marze_CH: parseNum(r['CH'] || r['Marže CH'] || r['4'] || '0'),
        marze_WEU: parseNum(r['WEU'] || r['Marže WEU'] || r['5'] || '0'),
        marze_SK: parseNum(r['SK'] || r['Marže SK'] || r['6'] || '0'),
        marze_PL: parseNum(r['PL'] || r['Marže PL'] || r['7'] || '0'),
        marze_GB: parseNum(r['GB'] || r['Marže GB'] || r['8'] || '0'),
        marze_DEAT: parseNum(r['DEAT'] || r['DE/AT'] || r['9'] || '0'),
        skladem: parseNum(r['Skladem'] || r['10'] || '0'),
      }))
      return { skupina, produkty }
    })

    return { skupiny }
  } catch (e) {
    console.error('parseSection14 error:', e)
    return undefined
  }
}

function parseSection15($: CheerioAPI): Section15 | undefined {
  try {
    const heading = findHeading($, [
      /15[\.\)]\s*(nesoulad|kategorizac)/i,
      'nesoulad kategorizace',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const table = findTable($, content)
    if (!table) return { kategorie: [] }

    const rows = parseTable($, table)
    const kategorie = rows.map((r) => ({
      nazev: r['Kategorie'] || r['Název'] || r['0'] || '',
      pocet_pravidel: parseNum(r['Pravidel'] || r['Počet pravidel'] || r['1'] || '0'),
      produktu_mimo: parseNum(r['Produktů mimo'] || r['Mimo'] || r['2'] || '0'),
    }))

    return { kategorie }
  } catch (e) {
    console.error('parseSection15 error:', e)
    return undefined
  }
}

// ---------------------------------------------------------------------------
// KPI computation
// ---------------------------------------------------------------------------

function computeKPI(sections: ReportSections): ReportKPI {
  return {
    sec1_count: sections.sec1?.count ?? sections.sec1?.items.length ?? 0,
    sec4_count: sections.sec4?.zeme.reduce((sum, z) => sum + z.produkty.length, 0) ?? 0,
    sec14_count: sections.sec14?.skupiny.reduce((sum, s) => sum + s.produkty.length, 0) ?? 0,
    sec13_count: sections.sec13?.items.length ?? 0,
    sec9_terms: sections.sec9?.terminy.length ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseReportEmail(html: string, date: string, fetchedAt: string, reportType = 'obchodni'): Report {
  const $ = cheerio.load(html)
  const sections: ReportSections = {}

  try { sections.sec1 = parseSection1($) } catch (e) { console.error('sec1', e) }
  try { sections.sec2 = parseSection2($) } catch (e) { console.error('sec2', e) }
  try { sections.sec3 = parseSection3($) } catch (e) { console.error('sec3', e) }
  try { sections.sec4 = parseSection4($) } catch (e) { console.error('sec4', e) }
  try { sections.sec7 = parseSection7($) } catch (e) { console.error('sec7', e) }
  try { sections.sec9 = parseSection9($) } catch (e) { console.error('sec9', e) }
  try { sections.sec11 = parseSection11($) } catch (e) { console.error('sec11', e) }
  try { sections.sec12 = parseSection12($) } catch (e) { console.error('sec12', e) }
  try { sections.sec13 = parseSection13($) } catch (e) { console.error('sec13', e) }
  try { sections.sec14 = parseSection14($) } catch (e) { console.error('sec14', e) }
  try { sections.sec15 = parseSection15($) } catch (e) { console.error('sec15', e) }

  const kpi = computeKPI(sections)
  return { date, reportType, fetchedAt, kpi, sections }
}
