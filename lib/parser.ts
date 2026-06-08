import * as cheerio from 'cheerio'
import type { CheerioAPI, Cheerio } from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { parseSkladovyEmail } from '@/lib/parser-skladovy'
import { parseUcetniEmail } from '@/lib/parser-ucetni'
import {
  Report,
  ReportSections,
  ReportKPI,
  Section1,
  Section2,
  Section3,
  Section4,
  Section4Product,
  Section5,
  Section6,
  Section7,
  Section8,
  Section8Strom,
  Section9,
  Section10,
  Section11,
  Section12,
  Section13,
  Section14,
  Section15,
  Section15Kategorie,
  Section15Strom,
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
    if (rowIdx === 0 && headers.length > 0 && cells[0] === headers[0]) return
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
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

    let total = extractCount(heading.text())
    const celkemMatch = /celkem\s+produkt[ůu][:\s]+\(?(\d+)\)?/i.exec(allText)
    if (celkemMatch) total = parseInt(celkemMatch[1], 10)

    const sample: Section1['sample'] = []

    const bulletLines = findBulletLines($, content)
    for (const { text, url } of bulletLines) {
      const m = /^(\d+)\s*\(([^)]+)\)\s*-\s*(.+?)\s*-\s*(\d+)\s*\|\s*(.+?)\s*-\s*(.+)$/.exec(text.trim())
      if (m) {
        sample.push({ id: m[1], typ: m[2].trim(), nazev: m[3].trim(), skupina_id: m[4], skupina_nazev: m[5].trim(), admin: m[6].trim(), url })
      }
    }

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
        if (!kod || /^kód?$/i.test(kod) || /celkem/i.test(kod)) continue
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

        const gm = /\s(\d{1,3}\s*\|\s*\S[^\n]*?)\s{2,}(\S+(?:\s+\S+)?)\s*(-?[\d]+\.?[\d]*)?\s*$/.exec(line)
        if (!gm) continue

        const before = line.substring(0, line.length - gm[0].length).trim()
        const skupina = gm[1].trim()
        const admin = gm[2].trim()
        const skladem = gm[3] ? parseNum(gm[3]) : 0

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

    const bulletLines = findBulletLines($, content)
    for (const { text, url } of bulletLines) {
      const m = /^(\d+)\s*-\s*(.+?)\s*-\s*ceník:\s*(.+?)\s*-\s*(\d+)\s*\|\s*(.+?)\s*-\s*(.+)$/.exec(text.trim())
      if (m) {
        allRows.push({ id: m[1], nazev: m[2].trim(), cenik: m[3].trim(), skupina_id: m[4], skupina_nazev: m[5].trim(), admin: m[6].trim(), url })
      }
    }

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

function parseSection5($: CheerioAPI): Section5 | undefined {
  try {
    const heading = findHeading($, [
      /5[\.\)].*(taric|nemožnost)/i,
      'taric',
      'nemožnost odeslání',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const allText = content.map((el) => el.text()).join('\n')

    let total = extractCount(heading.text())
    const celkemMatch = /celkem[:\s]+\(?(\d+)\)?/i.exec(allText)
    if (celkemMatch) total = parseInt(celkemMatch[1], 10)

    const items: Section5['items'] = []

    const bulletLines = findBulletLines($, content)
    for (const { text, url } of bulletLines) {
      // "1234567 (typ) - Název - 15 | skupina - Admin"
      const m = /^(\d+)\s*\(([^)]+)\)\s*-\s*(.+?)\s*-\s*(\d+)\s*\|\s*(.+?)\s*-\s*(.+)$/.exec(text.trim())
      if (m) {
        items.push({ kod: m[1], typ: m[2].trim(), nazev: m[3].trim(), skupina: `${m[4]} | ${m[5].trim()}`, admin: m[6].trim(), url })
      }
    }

    if (items.length === 0) {
      const table = findTable($, content)
      if (table) {
        parseTableWithUrls($, table).forEach(({ row: r, url }) => {
          items.push({
            kod: r['Kód'] || r['ID'] || r['0'] || '',
            typ: r['Typ'] || r['1'] || '',
            nazev: r['Název'] || r['2'] || '',
            skupina: r['Skupina'] || r['3'] || '',
            admin: r['Admin'] || r['4'] || '',
            url,
          })
        })
      }
    }

    const bySkupina: Record<string, number> = {}
    const byAdmin: Record<string, number> = {}
    for (const item of items) {
      const s = item.skupina || 'Neznámá'; bySkupina[s] = (bySkupina[s] || 0) + 1
      const a = item.admin || 'Neznámý'; byAdmin[a] = (byAdmin[a] || 0) + 1
    }

    return { total: total || items.length, items, stats: { bySkupina, byAdmin } }
  } catch (e) { console.error('parseSection5 error:', e); return undefined }
}

function parseSection6($: CheerioAPI): Section6 | undefined {
  try {
    const heading = findHeading($, [
      /6[\.\)].*(taric|nevyplněn)/i,
      'nevyplněný taric',
      'taric kód',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const allText = content.map((el) => el.text()).join('\n')

    let total = extractCount(heading.text())
    const celkemMatch = /celkem[:\s]+\(?(\d+)\)?/i.exec(allText)
    if (celkemMatch) total = parseInt(celkemMatch[1], 10)

    const items: Section6['items'] = []

    const table = findTable($, content)
    if (table) {
      parseTable($, table).forEach((r) => {
        const un_kod = r['UN kód'] || r['UN'] || r['Kód'] || r['0'] || ''
        const pocet = parseNum(r['Počet'] || r['Produktů'] || r['1'] || '0')
        if (un_kod) items.push({ un_kod, pocet })
      })
    }

    if (items.length === 0) {
      // bullet / list fallback: "UN_KOD: N produktů"
      const bulletLines = findBulletLines($, content)
      for (const { text } of bulletLines) {
        const m = /^(.+?)[:\s]+(\d+)/.exec(text.trim())
        if (m) items.push({ un_kod: m[1].trim(), pocet: parseInt(m[2], 10) })
      }
    }

    const derivedTotal = items.reduce((s, i) => s + i.pocet, 0)

    return { total: total || derivedTotal, items }
  } catch (e) { console.error('parseSection6 error:', e); return undefined }
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
    if (!table) return { total: 0, items: [] }

    const rows = parseTable($, table)
    const items = rows.map((r) => ({
      kod: r['Kód'] || r['kod'] || r['0'] || '',
      typ: r['Typ'] || r['1'] || '',
      nazev: r['Název'] || r['2'] || '',
      skupina: r['Skupina'] || r['3'] || '',
      admin: r['Admin'] || r['4'] || '',
      skladem: parseNum(r['Skladem'] || r['5'] || '0'),
    }))

    return { total: items.length, items }
  } catch (e) {
    console.error('parseSection7 error:', e)
    return undefined
  }
}

function parseSection8($: CheerioAPI): Section8 | undefined {
  try {
    const heading = findHeading($, [
      /8[\.\)]\s*(kategori)/i,
      /8[\.\)].*(nesoulad)/i,
      'kategorie — strom',
      'nesoulad kategorizace',
    ])
    if (!heading) return undefined

    const content = collectSectionContent($, heading)
    const allText = content.map((el) => el.text()).join('\n')

    let celkem_mimo = 0
    const mimoMatch = /celkem\s+mimo[:\s]+(\d+)/i.exec(allText)
    if (mimoMatch) celkem_mimo = parseInt(mimoMatch[1], 10)

    const stromy: Section8Strom[] = []
    let currentStrom: Section8Strom | null = null

    // Parse tree: h3/h4 or bold text = tree node, li = category entry
    for (const el of content) {
      const tag = (el[0] as Element)?.tagName?.toLowerCase()
      const text = el.text().trim()

      // Tree node heading: bold or h3/h4
      if (tag && /^h[3-5]$/.test(tag)) {
        currentStrom = { nazev: text, kategorie: [] }
        stromy.push(currentStrom)
        continue
      }

      if (tag === 'ul' || tag === 'ol') {
        el.find('li').each((_, li) => {
          const t = $(li).text().trim()
          if (!t) return
          // Check if this is a tree node marker "N - Název"
          const nodeM = /^(\d+)\s*[-–]\s*(.+)$/.exec(t)
          if (nodeM && !t.includes('pravidel') && !t.includes('produktů')) {
            currentStrom = { nazev: nodeM[2].trim(), kategorie: [] }
            stromy.push(currentStrom)
            return
          }
          // Category entry: "Název N pravidel | M produktů mimo kategorii"
          const catM = /^(.+?)\s+(\d+)\s+pravidel\s*[|\/,]\s*(\d+)\s+produkt/i.exec(t)
          if (catM && currentStrom) {
            currentStrom.kategorie.push({
              nazev: catM[1].trim(),
              pocet_pravidel: parseInt(catM[2], 10),
              produktu_mimo: parseInt(catM[3], 10),
            })
          }
        })
        continue
      }

      // Table fallback — single table with all kategorie
      if (tag === 'table') {
        const rows = parseTable($, el)
        for (const r of rows) {
          const nazev = r['Kategorie'] || r['Název'] || r['0'] || ''
          if (!nazev) continue
          if (!currentStrom) {
            currentStrom = { nazev: 'Ostatní', kategorie: [] }
            stromy.push(currentStrom)
          }
          currentStrom.kategorie.push({
            nazev,
            pocet_pravidel: parseNum(r['Pravidel'] || r['1'] || '0'),
            produktu_mimo: parseNum(r['Produktů mimo'] || r['2'] || '0'),
          })
        }
      }
    }

    const celkem_kategorii = stromy.reduce((s, st) => s + st.kategorie.length, 0)
    if (!celkem_mimo) {
      celkem_mimo = stromy.reduce((s, st) => s + st.kategorie.reduce((ss, k) => ss + k.produktu_mimo, 0), 0)
    }

    return { celkem_kategorii, celkem_mimo, stromy }
  } catch (e) { console.error('parseSection8 error:', e); return undefined }
}

function parseSection9($: CheerioAPI): Section9 | undefined {
  try {
    const heading = findHeading($, [
      /9[\.\)]\s*(likvidac|objednán)/i,
      'objednány k likvidaci',
      'k likvidaci',
    ])
    if (!heading) return undefined

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

function parseSection10($: CheerioAPI): Section10 | undefined {
  try {
    const heading = findHeading($, [
      /10[\.\)].*(limit|autoobjednání|auto.?objednání)/i,
      'autoobjednání',
      'limit objednání',
    ])
    if (!heading) return undefined

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
    console.error('parseSection10 error:', e)
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
    const allText = content.map((el) => el.text()).join('\n')

    // Parse "Celkový počet produktů: 1803" or "celkem N produktů"
    let celkem_produktu = 0
    const produktuMatch = /celkov[ýý]\s+počet\s+produkt[ůu][:\s]+(\d+)/i.exec(allText)
      || /celkem\s+(\d+)\s+produkt/i.exec(allText)
    if (produktuMatch) celkem_produktu = parseInt(produktuMatch[1], 10)

    const items: Section11['items'] = []

    // Try bullet list format: "15 | travel - Lukas Drbal - 888"
    const bulletLines = findBulletLines($, content)
    for (const { text } of bulletLines) {
      // skip summary/celkem lines
      if (/celkem|celkov/i.test(text)) continue
      const m = /^(\d+)\s*\|\s*(.+?)\s*[-–]\s*(.+?)\s*[-–]\s*(\d+)$/.exec(text.trim())
      if (m) {
        items.push({
          skupina_id: m[1],
          skupina_nazev: m[2].trim(),
          admin: m[3].trim(),
          pocet: parseInt(m[4], 10),
        })
      }
    }

    // Fallback: table
    if (items.length === 0) {
      const table = findTable($, content)
      if (table) {
        const rows = parseTable($, table)
        rows.forEach((r) => {
          items.push({
            skupina_id: r['Skupina ID'] || r['skupina_id'] || r['0'] || '',
            skupina_nazev: r['Skupina'] || r['skupina_nazev'] || r['1'] || '',
            admin: r['Admin'] || r['2'] || '',
            pocet: parseNum(r['Počet'] || r['pocet'] || r['3'] || '0'),
          })
        })
      }
    }

    const celkem = items.reduce((sum, i) => sum + i.pocet, 0)

    const byAdmin: Record<string, number> = {}
    for (const item of items) {
      const a = item.admin || 'Neznámý'
      byAdmin[a] = (byAdmin[a] || 0) + item.pocet
    }

    return { items, celkem, celkem_produktu: celkem_produktu || celkem, byAdmin }
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
    const allText = content.map((el) => el.text()).join('\n')

    // Parse "Produkty v termínech celkem N produktů"
    let celkem_v_terminech = 0
    const terminMatch = /v\s+termín[eě]ch\s+celkem\s+(\d+)/i.exec(allText)
      || /celkem\s+(\d+)\s+produkt[ůu]\s+v\s+termín/i.exec(allText)
    if (terminMatch) celkem_v_terminech = parseInt(terminMatch[1], 10)

    const skupiny: Section12['skupiny'] = []

    // Bullet list: "Název skupiny (Admin) - N" or "N | skupina - Admin - count"
    const bulletLines = findBulletLines($, content)
    for (const { text } of bulletLines) {
      if (/celkem|celkov|v termín/i.test(text)) continue
      // "15 | skupina - Admin - 42"
      const m1 = /^(\d+)\s*\|\s*(.+?)\s*[-–]\s*(.+?)\s*[-–]\s*(\d+)$/.exec(text.trim())
      if (m1) {
        skupiny.push({ nazev: `${m1[1]} | ${m1[2].trim()}`, pocet: parseInt(m1[4], 10), admin: m1[3].trim() })
        continue
      }
      // "Název - N"
      const m2 = /^(.+?)\s*[-–]\s*(\d+)$/.exec(text.trim())
      if (m2) {
        skupiny.push({ nazev: m2[1].trim(), pocet: parseInt(m2[2], 10) })
        continue
      }
    }

    // Fallback: table
    if (skupiny.length === 0) {
      const table = findTable($, content)
      if (table) {
        const rows = parseTable($, table)
        rows.forEach((r) => {
          skupiny.push({
            nazev: r['Název'] || r['Skupina'] || r['0'] || '',
            pocet: parseNum(r['Počet'] || r['1'] || '0'),
            admin: r['Admin'] || r['2'] || undefined,
          })
        })
      }
    }

    const celkem_produktu = skupiny.reduce((sum, s) => sum + s.pocet, 0)

    let pocet_terminu_oz = 0
    const termMatch = /termín[ů\s]+OZ[:\s]+(\d+)/i.exec(allText)
    if (termMatch) pocet_terminu_oz = parseInt(termMatch[1], 10)

    const byAdmin: Record<string, number> = {}
    for (const sk of skupiny) {
      if (sk.admin) {
        byAdmin[sk.admin] = (byAdmin[sk.admin] || 0) + sk.pocet
      }
    }

    return { celkem_produktu, celkem_v_terminech, pocet_terminu_oz, skupiny, byAdmin }
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
    const allText = content.map((el) => el.text()).join('\n')

    let total = 0
    const celkemMatch = /celkem\s+(\d+)\s+záznam/i.exec(allText)
      || /celkem[:\s]+\(?(\d+)\)?/i.exec(allText)
    if (celkemMatch) total = parseInt(celkemMatch[1], 10)

    const items: Section13['items'] = []

    const table = findTable($, content)
    if (table) {
      const rows = parseTable($, table)
      rows.forEach((r) => {
        items.push({
          kod: r['Kód'] || r['kod'] || r['0'] || '',
          nazev: r['Název'] || r['1'] || '',
          skupina: r['Skupina'] || r['2'] || '',
          admin: r['Admin'] || r['3'] || '',
        })
      })
    } else {
      const listItems = findListItems($, content)
      listItems.forEach((li) => items.push({ kod: '', nazev: li, skupina: '', admin: '' }))
    }

    const bySkupina: Record<string, number> = {}
    const byAdmin: Record<string, number> = {}
    for (const item of items) {
      const s = item.skupina || 'Neznámá'; bySkupina[s] = (bySkupina[s] || 0) + 1
      const a = item.admin || 'Neznámý'; byAdmin[a] = (byAdmin[a] || 0) + 1
    }

    return { total: total || items.length, items, stats: { bySkupina, byAdmin } }
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

    const stromy: Section15Strom[] = []
    let currentStrom: Section15Strom | null = null

    for (const el of content) {
      const tag = (el[0] as Element)?.tagName?.toLowerCase()
      const text = el.text().trim()

      // Tree node heading: h3/h4 or bold
      if (tag && /^h[3-5]$/.test(tag)) {
        currentStrom = { nazev: text, kategorie: [] }
        stromy.push(currentStrom)
        continue
      }

      if (tag === 'ul' || tag === 'ol') {
        el.find('li').each((_, li) => {
          const t = $(li).text().trim()
          if (!t) return
          // Tree node: "N - Název" (no pravidel/produktů)
          const nodeM = /^(\d+)\s*[-–]\s*(.+)$/.exec(t)
          if (nodeM && !t.includes('pravidel') && !t.includes('produkt')) {
            currentStrom = { nazev: nodeM[2].trim(), kategorie: [] }
            stromy.push(currentStrom)
            return
          }
          // Category: "Název N pravidel | M produktů mimo kategorii"
          const catM = /^(.+?)\s+(\d+)\s+pravidel\s*[|\/,]\s*(\d+)\s+produkt/i.exec(t)
          if (catM && currentStrom) {
            currentStrom.kategorie.push({
              nazev: catM[1].trim(),
              pocet_pravidel: parseInt(catM[2], 10),
              produktu_mimo: parseInt(catM[3], 10),
            })
          }
        })
        continue
      }

      // Table fallback — flat table
      if (tag === 'table') {
        const rows = parseTable($, el)
        for (const r of rows) {
          const nazev = r['Kategorie'] || r['Název'] || r['0'] || ''
          if (!nazev) continue
          if (!currentStrom) {
            currentStrom = { nazev: 'Ostatní', kategorie: [] }
            stromy.push(currentStrom)
          }
          currentStrom.kategorie.push({
            nazev,
            pocet_pravidel: parseNum(r['Pravidel'] || r['1'] || '0'),
            produktu_mimo: parseNum(r['Produktů mimo'] || r['2'] || '0'),
          })
        }
      }
    }

    // Flat list for export / backward compat
    const kategorie: Section15Kategorie[] = stromy.flatMap((st) => st.kategorie)
    const celkem_kategorii = kategorie.length
    const celkem_mimo = kategorie.reduce((s, k) => s + k.produktu_mimo, 0)

    return { celkem_kategorii, celkem_mimo, kategorie, stromy }
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
    sec13_count: sections.sec13?.total ?? sections.sec13?.items.length ?? 0,
    sec9_terms: sections.sec9?.terminy.length ?? 0,
    sec2_count: sections.sec2?.total,
    sec3_count: sections.sec3?.uniqueCount,
    sec5_count: sections.sec5?.total,
    sec6_count: sections.sec6?.total,
    sec7_count: sections.sec7?.total,
    sec8_count: sections.sec8?.celkem_mimo,
    sec9_count: sections.sec9?.items.length,
    sec10_count: sections.sec10?.items.length,
    sec11_count: sections.sec11?.celkem_produktu,
    sec12_count: sections.sec12?.celkem_produktu,
    sec15_count: sections.sec15?.celkem_mimo,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseReportEmail(html: string, date: string, fetchedAt: string, reportType = 'obchodni'): Report {
  if (reportType === 'skladovy') return parseSkladovyEmail(html, date, fetchedAt)
  if (reportType === 'ucetni') return parseUcetniEmail(html, date, fetchedAt)

  const $ = cheerio.load(html)
  const sections: ReportSections = {}

  try { sections.sec1 = parseSection1($) } catch (e) { console.error('sec1', e) }
  try { sections.sec2 = parseSection2($) } catch (e) { console.error('sec2', e) }
  try { sections.sec3 = parseSection3($) } catch (e) { console.error('sec3', e) }
  try { sections.sec4 = parseSection4($) } catch (e) { console.error('sec4', e) }
  try { sections.sec5 = parseSection5($) } catch (e) { console.error('sec5', e) }
  try { sections.sec6 = parseSection6($) } catch (e) { console.error('sec6', e) }
  try { sections.sec7 = parseSection7($) } catch (e) { console.error('sec7', e) }
  try { sections.sec8 = parseSection8($) } catch (e) { console.error('sec8', e) }
  try { sections.sec9 = parseSection9($) } catch (e) { console.error('sec9', e) }
  try { sections.sec10 = parseSection10($) } catch (e) { console.error('sec10', e) }
  try { sections.sec11 = parseSection11($) } catch (e) { console.error('sec11', e) }
  try { sections.sec12 = parseSection12($) } catch (e) { console.error('sec12', e) }
  try { sections.sec13 = parseSection13($) } catch (e) { console.error('sec13', e) }
  try { sections.sec14 = parseSection14($) } catch (e) { console.error('sec14', e) }
  try { sections.sec15 = parseSection15($) } catch (e) { console.error('sec15', e) }

  const kpi = computeKPI(sections)
  return { date, reportType, fetchedAt, kpi, sections }
}
