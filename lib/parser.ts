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
  Section4Product,
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

/** Extract bullet/list lines from content elements — handles <li>, and <p>/<div> starting with • */
function findBulletLines($: CheerioAPI, elements: Cheerio<AnyNode>[]): { text: string; url?: string }[] {
  const lines: { text: string; url?: string }[] = []
  for (const el of elements) {
    el.find('li').each((_, li) => {
      const t = $(li).text().trim()
      if (!t) return
      const url = $(li).find('a[href]').first().attr('href') || undefined
      lines.push({ text: t, url })
    })
    el.find('p, div, td').each((_, p) => {
      const t = $(p).text().trim()
      if (t.startsWith('•') || t.startsWith('·')) {
        const url = $(p).find('a[href]').first().attr('href') || undefined
        lines.push({ text: t.replace(/^[•·]\s*/, ''), url })
      }
    })
    const tag = (el[0] as Element)?.tagName?.toLowerCase()
    if (tag === 'li') {
      const t = el.text().trim()
      const url = el.find('a[href]').first().attr('href') || undefined
      if (t) lines.push({ text: t, url })
    }
  }
  return lines.filter(({ text }) => Boolean(text))
}

/** Like parseTable but also captures the first href found in each row */
function parseTableWithUrls($: CheerioAPI, tableEl: Cheerio<AnyNode>): { row: Record<string, string>; url?: string }[] {
  const headers: string[] = []
  tableEl.find('thead tr th, thead tr td').each((_, th) => { headers.push($(th).text().trim()) })
  if (headers.length === 0) {
    tableEl.find('tr').first().find('th, td').each((_, th) => { headers.push($(th).text().trim()) })
  }
  const results: { row: Record<string, string>; url?: string }[] = []
  tableEl.find('tbody tr, tr').each((rowIdx, tr) => {
    const cells: string[] = []
    $(tr).find('td, th').each((_, td) => { cells.push($(td).text().trim()) })
    if (cells.length === 0) return
    if (rowIdx === 0 && headers.length > 0 && cells[0] === headers[0]) return
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
    cells.forEach((c, i) => { if (!row[i.toString()]) row[i.toString()] = c })
    const url = $(tr).find('a[href]').first().attr('href') || undefined
    results.push({ row, url })
  })
  return results
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

    const content = collectSectionContent($, heading)
    const allText = content.map((el) => el.text()).join('\n')

    // Total from "celkem produktů: (N)" in content, or from heading
    let total = extractCount(heading.text())
    const celkemMatch = /celkem\s+produkt[ůu][:\s]+\(?(\d+)\)?/i.exec(allText)
    if (celkemMatch) total = parseInt(celkemMatch[1], 10)

    const sample: Section1['sample'] = []

    // Primary: bullet list format — "1423047 (thuleBundle) - Název - 15 | skupina - Admin"
    const bulletLines = findBulletLines($, content)
    for (const { text, url } of bulletLines) {
      const m = /^(\d+)\s*\(([^)]+)\)\s*-\s*(.+?)\s*-\s*(\d+)\s*\|\s*(.+?)\s*-\s*(.+)$/.exec(text.trim())
      if (m) {
        sample.push({ id: m[1], typ: m[2].trim(), nazev: m[3].trim(), skupina_id: m[4], skupina_nazev: m[5].trim(), admin: m[6].trim(), url })
      }
    }

    // Fallback: table
    if (sample.length === 0) {
      const table = findTable($, content)
      if (table) {
        parseTableWithUrls($, table).forEach(({ row: r, url }) => {
          sample.push({
            id: r['ID'] || r['Kód'] || r['0'] || '',
            typ: r['Typ'] || r['1'] || '',
            nazev: r['Název'] || r['2'] || '',
            skupina_id: r['Skupina ID'] || r['3'] || '',
            skupina_nazev: r['Skupina'] || r['4'] || '',
            admin: r['Odpovědná osoba'] || r['Admin'] || r['5'] || '',
            url,
          })
        })
      }
    }

    const byType: Record<string, number> = {}
    const byGroup: Record<string, number> = {}
    for (const item of sample) {
      const t = item.typ || 'Neznámý'; byType[t] = (byType[t] || 0) + 1
      const g = item.skupina_id ? `${item.skupina_id} | ${item.skupina_nazev}` : item.skupina_nazev || 'Neznámá'
      byGroup[g] = (byGroup[g] || 0) + 1
    }

    return { total: total || sample.length, sample, stats: { byType, byGroup } }
  } catch (e) { console.error('parseSection1 error:', e); return undefined }
}

function parseSection2($: CheerioAPI): Section2 | undefined {
  try {
    const heading = findHeading($, [
      /2[\.\)]\s*(saleable|dodavatel)/i,
      'saleable bez dodavatelského',
      'bez dodavatelského skladu',
      'dodavatelském skladu',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const sample: Section2['sample'] = []
    const normalizeAdmin = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2')

    const addRows = (entries: { row: Record<string, string>; url?: string }[], dodavatelOverride?: string) => {
      for (const { row: r, url } of entries) {
        const kod = r['Kód'] || r['kod'] || r['1'] || ''
        // Skip repeated header rows (kod is literally "Kód") and subtotal rows ("celkem")
        if (!kod || /^kód?$/i.test(kod) || /celkem/i.test(kod)) continue
        // Skip subtotal rows where the dodavatel cell contains "celkem N záznamů"
        const dodavatel = dodavatelOverride || r['Dodavatel'] || r['dodavatel'] || r['0'] || ''
        if (/celkem\s+\d+/i.test(dodavatel)) continue

        const sklademStr = r['Skladem u dodavatele'] || r['Skladem'] || r['5'] || r['skladem'] || ''
        sample.push({
          dodavatel,
          kod,
          nazev: r['Název'] || r['Nazev'] || r['2'] || '',
          skupina: r['Skupina'] || r['3'] || '',
          admin: normalizeAdmin(r['Admin'] || r['4'] || ''),
          skladem: sklademStr ? parseNum(sklademStr) : 0,
          url,
        })
      }
    }

    const tables = findTables($, content)
    if (tables.length === 0) {
      const table = findTable($, content)
      if (table) addRows(parseTableWithUrls($, table))
    } else if (tables.length === 1) {
      addRows(parseTableWithUrls($, tables[0]))
    } else {
      for (const t of tables) {
        const prevText = t.prev('h3, h4, b, strong, p').text().trim()
        addRows(parseTableWithUrls($, t), prevText || undefined)
      }
    }

    // Text-based fallback when the table approach yields nothing
    if (sample.length === 0) {
      const lines = content
        .map((el) => el.text())
        .join('\n')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      for (const line of lines) {
        if (/^dodavatel\s+kód/i.test(line)) continue
        if (/celkem\s+\d+\s+záznam/i.test(line)) continue
        if (/^vygenerováno/i.test(line)) continue

        // Anchor on group pattern "NN | name" then extract code and company before it
        const gm = /\s(\d{1,3}\s*\|\s*\S[^\n]*?)\s{2,}(\S+(?:\s+\S+)?)\s*(-?[\d]+\.?[\d]*)?\s*$/.exec(line)
        if (!gm) continue

        const before = line.substring(0, line.length - gm[0].length).trim()
        const skupina = gm[1].trim()
        const admin = gm[2].trim()
        const skladem = gm[3] ? parseNum(gm[3]) : 0

        // Code is the first numeric token after the company name
        const cm = /\s+([\d][\d.-]*)\s+(.+)$/.exec(before)
        if (!cm) continue

        const dodavatel = before.substring(0, before.length - cm[0].length).trim()
        if (!dodavatel || !cm[1]) continue

        sample.push({
          dodavatel,
          kod: cm[1],
          nazev: cm[2].trim(),
          skupina,
          admin: normalizeAdmin(admin),
          skladem,
          url: undefined,
        })
      }
    }

    const byDodavatel: Record<string, number> = {}
    const byGroup: Record<string, number> = {}
    for (const item of sample) {
      const d = item.dodavatel || 'Neznámý'; byDodavatel[d] = (byDodavatel[d] || 0) + 1
      const g = item.skupina || 'Neznámá'; byGroup[g] = (byGroup[g] || 0) + 1
    }

    return { total: sample.length, sample, stats: { byDodavatel, byGroup } }
  } catch (e) { console.error('parseSection2 error:', e); return undefined }
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
    const allRows: Section3['sample'] = []

    // Primary: bullet format — "1356003 - Název - ceník: MOC PL - 14 | skupina - Admin"
    const bulletLines = findBulletLines($, content)
    for (const { text, url } of bulletLines) {
      const m = /^(\d+)\s*-\s*(.+?)\s*-\s*ceník:\s*(.+?)\s*-\s*(\d+)\s*\|\s*(.+?)\s*-\s*(.+)$/.exec(text.trim())
      if (m) {
        allRows.push({ id: m[1], nazev: m[2].trim(), cenik: m[3].trim(), skupina_id: m[4], skupina_nazev: m[5].trim(), admin: m[6].trim(), url })
      }
    }

    // Fallback: table
    if (allRows.length === 0) {
      const table = findTable($, content)
      if (table) {
        parseTableWithUrls($, table).forEach(({ row: r, url }) => {
          allRows.push({
            id: r['ID'] || r['Kód'] || r['0'] || '',
            nazev: r['Název'] || r['1'] || '',
            cenik: r['Ceník'] || r['Cena'] || r['2'] || '',
            skupina_id: '',
            skupina_nazev: r['Skupina'] || r['3'] || '',
            admin: r['Admin'] || r['4'] || '',
            url,
          })
        })
      }
    }

    const totalRows = allRows.length

    // Dedup by ID — keep first occurrence
    const seen = new Set<string>()
    const sample = allRows.filter((row) => { if (seen.has(row.id)) return false; seen.add(row.id); return true })
    const uniqueCount = sample.length

    const byCenik: Record<string, number> = {}
    const byGroup: Record<string, number> = {}
    for (const item of sample) {
      const c = item.cenik || 'Neznámý'; byCenik[c] = (byCenik[c] || 0) + 1
      const g = item.skupina_id ? `${item.skupina_id} | ${item.skupina_nazev}` : item.skupina_nazev || 'Neznámá'
      byGroup[g] = (byGroup[g] || 0) + 1
    }

    return { totalRows, uniqueCount, sample, stats: { byCenik, byGroup } }
  } catch (e) { console.error('parseSection3 error:', e); return undefined }
}

function parseSection4($: CheerioAPI): Section4 | undefined {
  try {
    const heading = findHeading($, [
      /4[\.\)]\s*(nelze|doručit)/i,
      'nelze doručit',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)

    const countryRe = /^([A-Z]{2,4})$/
    const productRe = /^(\d+)\s+(\S+)\s+(.+?)\s+(\d+)\s*\|\s*(.+?)\s+(\S+)$/
    const normalizeAdmin = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2')

    const productsMap = new Map<string, Section4Product>()
    const countryCounts: Record<string, number> = {}
    let currentCountry: string | null = null
    let totalRaw = 0

    const setCountry = (code: string) => {
      currentCountry = code
      if (countryCounts[code] === undefined) countryCounts[code] = 0
    }

    const addProduct = (id: string, typ: string, nazev: string, skupina: string, admin: string, url?: string) => {
      if (!currentCountry) return
      countryCounts[currentCountry] = (countryCounts[currentCountry] || 0) + 1
      totalRaw++
      if (productsMap.has(id)) {
        const p = productsMap.get(id)!
        if (!p.countries.includes(currentCountry)) p.countries.push(currentCountry)
        if (!p.url && url) p.url = url
      } else {
        productsMap.set(id, {
          id, typ, nazev: nazev.trim(), skupina: skupina.trim(),
          admin: normalizeAdmin(admin), url, countries: [currentCountry],
        })
      }
    }

    for (const el of content) {
      const tag = (el[0] as Element)?.tagName?.toLowerCase()
      const elText = el.text().trim()

      if (countryRe.test(elText)) { setCountry(elText); continue }

      if (tag === 'table') {
        el.find('tr').each((_, tr) => {
          const cells: string[] = []
          $(tr).find('td, th').each((_, td) => { cells.push($(td).text().trim()) })
          const nonEmpty = cells.filter(Boolean)
          if (nonEmpty.length === 1 && countryRe.test(nonEmpty[0])) {
            setCountry(nonEmpty[0])
          } else if (currentCountry && nonEmpty.length >= 3 && /^\d+$/.test(cells[0] || '')) {
            const url = $(tr).find('a[href]').first().attr('href') || undefined
            addProduct(cells[0], cells[1] || '', cells[2] || '', cells[3] || '', cells[4] || cells[cells.length - 1] || '', url)
          }
        })
        continue
      }

      if (el.find('li').length) {
        el.find('li').each((_, li) => {
          const t = $(li).text().trim()
          if (countryRe.test(t)) { setCountry(t); return }
          if (!currentCountry) return
          const m = productRe.exec(t)
          if (m) {
            const url = $(li).find('a[href]').first().attr('href') || undefined
            addProduct(m[1], m[2], m[3], `${m[4]} | ${m[5].trim()}`, m[6], url)
          }
        })
        continue
      }

      const lines = elText.split('\n').map((l) => l.trim()).filter(Boolean)
      for (const line of lines) {
        if (countryRe.test(line)) { setCountry(line); continue }
        if (!currentCountry) continue
        const m = productRe.exec(line)
        if (m) addProduct(m[1], m[2], m[3], `${m[4]} | ${m[5].trim()}`, m[6])
      }
    }

    const products = Array.from(productsMap.values())
    const totalUnique = products.length

    const byType: Record<string, number> = {}
    const byGroup: Record<string, number> = {}
    for (const p of products) {
      byType[p.typ || 'Neznámý'] = (byType[p.typ || 'Neznámý'] || 0) + 1
      byGroup[p.skupina || 'Neznámá'] = (byGroup[p.skupina || 'Neznámá'] || 0) + 1
    }

    return { totalRaw, totalUnique, products, countryCounts, stats: { byType, byGroup } }
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
      /11[\.\)]\s*(mimo saleable|saleable|počet)/i,
      /11[\.\)].*(saleable|mimo prodejní)/i,
      'mimo saleable',
      'mimo prodejní režim',
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
      /13[\.\)].*(bez kategorie)/i,
      'saleable bez kategorie',
      'bez kategorie',
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
      /14[\.\)].*(zápornou|záporná|zaporna|marž)/i,
      'záporná marže',
      'zápornou marží',
      'zápornou',
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
    sec1_count: sections.sec1?.total ?? sections.sec1?.sample.length ?? 0,
    sec4_count: sections.sec4?.totalUnique ?? 0,
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
