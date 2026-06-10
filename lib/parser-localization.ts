import * as cheerio from 'cheerio'
import type {
  Report, ReportKPI, ReportSections,
  LcSec1, MdSec4SumarizaceRow, MdSec4UkolItem,
  LcSec2,
  LcSec3, LcSec3Country,
  LcSec4, LcSec4TextValues, LcSec4Category, LcSec4Subsection,
  LcSec5,
  LcSec6, LcSec6Subsection, LcSec6Item,
  LcSec7, LcSec7Item,
} from '@/types/report'

// ---------------------------------------------------------------------------
// HTML → lines (with link preservation)
// ---------------------------------------------------------------------------

function htmlToLines(html: string): string[] {
  const $ = cheerio.load(html)

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim()
    if (text && href) $(el).replaceWith(`[${text}](${href})`)
  })

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
// Helpers
// ---------------------------------------------------------------------------

function extractMdLink(s: string): { text: string; url?: string } {
  const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(s)
  if (m) return { text: m[1].trim(), url: m[2].trim() }
  return { text: s.replace(/\*\*/g, '').trim() }
}

function parseNum(s: string): number {
  const n = parseInt(s.replace(/\s/g, '').replace(/[^\d]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

function parseDateLine(line: string): string | undefined {
  // DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM:SS
  const m = /(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})/.exec(line)
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:00`
  return undefined
}

// ---------------------------------------------------------------------------
// Block splitting
// ---------------------------------------------------------------------------

interface LcBlock { num: number; title: string; lines: string[] }

function splitBlocks(lines: string[]): LcBlock[] {
  const blocks: LcBlock[] = []
  let current: LcBlock | null = null
  for (const line of lines) {
    const m = /^##\s+(\d+)\.\s+(.*)$/.exec(line)
    if (m) {
      if (current) blocks.push(current)
      current = { num: parseInt(m[1], 10), title: m[2].trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) blocks.push(current)
  return blocks
}

// ---------------------------------------------------------------------------
// Block 1 — MDM workflow (same as MasterData block 4)
// ---------------------------------------------------------------------------

const MDM_COL_ORDER = ['sablona', 'vlastnost', 'modelova_rada', 'znacka', 'externi_maska', 'textovy_vzorec', 'technologie', 'zastupny_text'] as const

function parseLcSec1(lines: string[]): LcSec1 {
  const sumarizace: MdSec4SumarizaceRow[] = []
  const ukoly: MdSec4UkolItem[] = []
  let inUkoly = false

  for (const line of lines) {
    if (/otevřené\s+úkol/i.test(line)) { inUkoly = true; continue }
    if (/šablona.*vlastnost|vlastnost.*šablona/i.test(line)) continue

    if (inUkoly) {
      const parts = line.split('|').map((s) => s.trim())
      if (parts.length >= 6) {
        const id = parts[0].replace(/\*\*/g, '').trim()
        if (!id || /^id$/i.test(id)) continue
        const resitel = parts[1].replace(/\*\*/g, '').trim()
        const typ = parts[2].trim()
        const entityLink = extractMdLink(parts[3])
        const zadavatel = parts[4].trim()
        const terminRaw = parts[5].trim()
        const stavRaw = parts[6]?.replace(/\*\*/g, '').trim().toLowerCase() || 'todo'
        let termin = terminRaw
        const dateM = /(\d{2})[-.](\d{2})[-.](\d{4})/.exec(terminRaw)
        if (dateM) termin = `${dateM[3]}-${dateM[2]}-${dateM[1]}`
        const stav = stavRaw === 'inprogress' ? 'inprogress' : 'todo'
        ukoly.push({ id, resitel, typ, entita: entityLink.text, entita_url: entityLink.url, zadavatel, termin, stav })
      }
    } else {
      const parts = line.split('|').map((s) => s.replace(/\*\*/g, '').trim())
      if (parts.length >= 9) {
        const resitel = parts[0]
        if (!resitel || /šablona|vlastnost|modelová/i.test(resitel)) continue
        const vals = parts.slice(1, 9).map((p) => parseNum(p))
        const row = { resitel, celkem: vals.reduce((s, v) => s + v, 0) } as MdSec4SumarizaceRow
        MDM_COL_ORDER.forEach((col, i) => { (row as unknown as Record<string, number>)[col] = vals[i] || 0 })
        sumarizace.push(row)
      }
    }
  }

  return { total: ukoly.length, sumarizace, ukoly }
}

// ---------------------------------------------------------------------------
// Block 2 — TASK MANAGER nedokončené překlady
// ---------------------------------------------------------------------------

function parseLcSec2(lines: string[]): LcSec2 {
  const languages: Record<string, number> = {}

  // Find two consecutive lines: header (language codes) + values
  for (let i = 0; i < lines.length - 1; i++) {
    const headerLine = lines[i]
    const valLine = lines[i + 1]

    // Language header: all uppercase 2-letter codes separated by spaces
    const codes = headerLine.trim().split(/\s+/)
    if (codes.length < 3 || !codes.every((c) => /^[A-Z]{2}$/.test(c))) continue

    // Value line: all numbers
    const vals = valLine.trim().split(/\s+/)
    if (vals.length !== codes.length || !vals.every((v) => /^\d+$/.test(v))) continue

    codes.forEach((code, j) => { languages[code] = parseInt(vals[j], 10) })
    break
  }

  const total = Object.values(languages).reduce((s, v) => s + v, 0)
  return { total, languages }
}

// ---------------------------------------------------------------------------
// Block 3 — DPH vyplněnost sazeb
// ---------------------------------------------------------------------------

const ISO3_MAP: Record<string, { flag: string; code: string }> = {
  FRA: { flag: '🇫🇷', code: 'FR' }, HRV: { flag: '🇭🇷', code: 'HR' }, NLD: { flag: '🇳🇱', code: 'NL' },
  AUT: { flag: '🇦🇹', code: 'AT' }, CZE: { flag: '🇨🇿', code: 'CZ' }, SVK: { flag: '🇸🇰', code: 'SK' },
  ROU: { flag: '🇷🇴', code: 'RO' }, SVN: { flag: '🇸🇮', code: 'SI' }, DEU: { flag: '🇩🇪', code: 'DE' },
  LVA: { flag: '🇱🇻', code: 'LV' }, ESP: { flag: '🇪🇸', code: 'ES' }, IRL: { flag: '🇮🇪', code: 'IE' },
  BEL: { flag: '🇧🇪', code: 'BE' }, ITA: { flag: '🇮🇹', code: 'IT' }, CHE: { flag: '🇨🇭', code: 'CH' },
  LUX: { flag: '🇱🇺', code: 'LU' }, HUN: { flag: '🇭🇺', code: 'HU' }, DNK: { flag: '🇩🇰', code: 'DK' },
  POL: { flag: '🇵🇱', code: 'PL' }, GBR: { flag: '🇬🇧', code: 'GB' },
}

function parseLcSec3(lines: string[]): LcSec3 {
  const countries: Record<string, LcSec3Country> = {}
  let generatedAt: string | undefined
  let header: string[] = []

  for (const line of lines) {
    // Date line
    if (/vygenerováno/i.test(line)) {
      generatedAt = parseDateLine(line) ?? undefined
      continue
    }

    // Country header: all-caps 3-letter codes
    const codes = line.split(/\s+/)
    if (codes.length >= 5 && codes.every((c) => /^[A-Z]{3}$/.test(c))) {
      header = codes
      continue
    }

    if (header.length === 0) continue

    // Data rows: filled NNNN NNNN ... or unFilled NNNN NNNN ...
    const filledM = /^filled\s+(.+)$/i.exec(line)
    const unfilledM = /^unFilled\s+(.+)$/i.exec(line)

    if (filledM) {
      const vals = filledM[1].split(/\s+/).map(parseNum)
      header.forEach((code, i) => {
        if (!countries[code]) countries[code] = { filled: 0, unFilled: 0 }
        countries[code].filled = vals[i] ?? 0
      })
    } else if (unfilledM) {
      const vals = unfilledM[1].split(/\s+/).map(parseNum)
      header.forEach((code, i) => {
        if (!countries[code]) countries[code] = { filled: 0, unFilled: 0 }
        countries[code].unFilled = vals[i] ?? 0
      })
    }
  }

  const total_unfilled = Object.values(countries).reduce((s, c) => s + c.unFilled, 0)
  return { generatedAt, total_unfilled, countries }
}

// ---------------------------------------------------------------------------
// Block 4 — TEXTY přehled generování
// ---------------------------------------------------------------------------

const TEXT_SUBSECTION_KEYS: Record<string, keyof LcSec4['subsections']> = {
  'název': 'nazev',
  'nazev': 'nazev',
  'krátký popis': 'kratkypopis',
  'kratky popis': 'kratkypopis',
  'detailní popis': 'detailnipopis',
  'detailni popis': 'detailnipopis',
}

const LANG_HEADER_LANGS = ['CS', 'ES', 'LV', 'FR', 'PL', 'HU', 'SL', 'RO', 'IT', 'SK', 'DE', 'DA', 'EN', 'NL']

function parseCellValues(s: string): LcSec4TextValues | null {
  // Pattern: N - N - N - N - N (5 numbers separated by ' - ')
  const m = s.match(/(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*-\s*(\d[\d\s]*)/)
  if (!m) return null
  return {
    generated: parseNum(m[1]),
    missing:   parseNum(m[2]),
    manual:    parseNum(m[3]),
    machine:   parseNum(m[4]),
    api:       parseNum(m[5]),
  }
}

function parseLcSec4(lines: string[]): LcSec4 {
  const emptySubsection = (): LcSec4Subsection => ({ categories: [], languageOrder: [] })
  const subsections: LcSec4['subsections'] = {
    nazev: emptySubsection(),
    kratkypopis: emptySubsection(),
    detailnipopis: emptySubsection(),
  }
  let generatedAt: string | undefined
  let currentKey: keyof typeof subsections = 'nazev'
  let langOrder: string[] = []
  let pendingCategoryId: string | null = null
  let pendingPerson: string | null = null

  for (const line of lines) {
    // Date
    if (/vygenerováno/i.test(line)) {
      generatedAt = parseDateLine(line) ?? undefined
      continue
    }

    // ### subsection heading
    if (line.startsWith('#')) {
      const clean = line.replace(/^#+\s*/, '').toLowerCase().trim()
      for (const [pat, key] of Object.entries(TEXT_SUBSECTION_KEYS)) {
        if (clean.includes(pat)) { currentKey = key; break }
      }
      continue
    }

    // Language header line: mix of 2-letter uppercase codes
    const tokens = line.split(/\s+/)
    if (tokens.length >= 10 && tokens.every((t) => /^[A-Z]{2}$/.test(t))) {
      langOrder = tokens
      subsections[currentKey].languageOrder = tokens
      continue
    }

    // Category heading: ** XX | name** or XX | name (short line with pipe)
    const catM = /^(\d+)\s*\|\s*(.+)$/.exec(line.replace(/\*\*/g, ''))
    if (catM) {
      pendingCategoryId = `${catM[1]}|${catM[2].trim()}`
      pendingPerson = null
      continue
    }

    if (!pendingCategoryId) continue

    // Data line: person + 14 groups of "A - B - C - D - E"
    // Try to extract all cell-value groups from the line
    const cellPattern = /(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/g
    const cells: LcSec4TextValues[] = []
    let m
    while ((m = cellPattern.exec(line)) !== null) {
      cells.push({
        generated: parseInt(m[1], 10),
        missing:   parseInt(m[2], 10),
        manual:    parseInt(m[3], 10),
        machine:   parseInt(m[4], 10),
        api:       parseInt(m[5], 10),
      })
    }

    if (cells.length > 0) {
      const effectiveLangs = langOrder.length > 0 ? langOrder : LANG_HEADER_LANGS
      // Extract person name: everything before the first digit group
      const personMatch = /^([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽa-záčďéěíňóřšťúůýž][a-záčďéěíňóřšťúůýž]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽa-záčďéěíňóřšťúůýž][a-záčďéěíňóřšťúůýž]+)*)\s+\d/.exec(line)
      const person = personMatch ? personMatch[1].trim() : (pendingPerson ?? '')

      const langMap: Record<string, LcSec4TextValues> = {}
      cells.forEach((cell, idx) => {
        const lang = effectiveLangs[idx]
        if (lang) langMap[lang] = cell
      })

      subsections[currentKey].categories.push({
        id: pendingCategoryId,
        person,
        languages: langMap,
      })
      pendingPerson = null
    } else if (line.length > 0 && !/^#/.test(line)) {
      // Could be just the person name on its own line
      pendingPerson = line.trim()
    }
  }

  const langOrder2 = langOrder.length > 0 ? langOrder : LANG_HEADER_LANGS
  return { generatedAt, languageOrder: langOrder2, subsections }
}

// ---------------------------------------------------------------------------
// Block 5 — PŘEKLADY nevyplněné hodnoty
// ---------------------------------------------------------------------------

const KNOWN_ENTITY_TYPES = [
  'Unifikovaný název', 'Kategorie: název', 'Kategorie: popis',
  'Vlastnost: název', 'Vlastnost: skupina položek název', 'Vlastnost: název položky',
  'Vlastnost: zástupný text položky', 'Překlad', 'Textový vzorec',
  'Vlastnost: textová u produktů', 'Technologie: název', 'Technologie: popis',
  'Atributy velikostní tabulky', 'Značka: krátký popis', 'Značka: dlouhý popis',
  'Značka pro kategorický strom: název', 'Značka pro kategorický strom: krátký popis',
  'Značka pro kategorický strom: dlouhý popis', 'Téma: název', 'Téma: krátký popis',
  'Téma: dlouhý popis', 'Modelová řada: název', 'Modelová řada: krátký popis',
  'Modelová řada: dlouhý popis', 'Modelová řada: doplňkový popis',
  'Stránka: název', 'Stránka: text pro výpis', 'Stránka: text',
]

function parseLcSec5(lines: string[]): LcSec5 {
  const rows: Record<string, Record<string, number>> = {}
  let generatedAt: string | undefined
  let languages: string[] = []

  for (const line of lines) {
    if (/vygenerováno/i.test(line)) {
      generatedAt = parseDateLine(line) ?? undefined
      continue
    }

    // Language header line
    const tokens = line.split(/\s+/)
    if (tokens.length >= 10 && tokens.every((t) => /^[A-Z]{2}$/.test(t))) {
      languages = tokens
      continue
    }

    if (languages.length === 0) continue

    // Data row: pipe-separated (from table) or space-separated
    let entityType = ''
    let vals: number[] = []

    if (line.includes('|')) {
      const parts = line.split('|').map((s) => s.trim())
      entityType = parts[0]
      vals = parts.slice(1).map(parseNum)
    } else {
      // Space-separated: entity name may have spaces, values are at the end
      // Try to match known entity type prefix
      const matched = KNOWN_ENTITY_TYPES.find((et) => line.toLowerCase().startsWith(et.toLowerCase()))
      if (matched) {
        entityType = matched
        const rest = line.slice(matched.length).trim()
        vals = rest.split(/\s+/).filter(Boolean).map(parseNum)
      } else {
        // Last resort: try to split at first run of digits
        const numStart = line.search(/\d/)
        if (numStart > 0) {
          entityType = line.slice(0, numStart).trim()
          vals = line.slice(numStart).trim().split(/\s+/).map(parseNum)
        }
      }
    }

    if (!entityType || vals.length === 0) continue
    const row: Record<string, number> = {}
    languages.forEach((lang, i) => { row[lang] = vals[i] ?? 0 })
    rows[entityType] = row
  }

  // Use canonical language order if available
  const canonicalLangs = ['CS', 'DA', 'DE', 'EN', 'ES', 'FR', 'HU', 'IT', 'LV', 'NL', 'PL', 'RO', 'SK', 'SL']
  if (languages.length === 0) languages = canonicalLangs

  let nonzero_combos = 0
  for (const row of Object.values(rows)) {
    for (const v of Object.values(row)) {
      if (v > 0) nonzero_combos++
    }
  }

  return { generatedAt, languages, rows, nonzero_combos }
}

// ---------------------------------------------------------------------------
// Block 6 — Thule generátor
// ---------------------------------------------------------------------------

const THULE_SUBSECTION_MAP: Record<string, keyof LcSec6['subsections']> = {
  'unifikovaný název': 'unifikovanyNazev',
  'unifikovany nazev': 'unifikovanyNazev',
  'název auta': 'nazevAuta',
  'nazev auta': 'nazevAuta',
  'konfigurace': 'konfigurace',
  'thule sloupec': 'thuleSloupec',
  'vlastnost': 'vlastnost',
}

function parseLcSec6(lines: string[]): LcSec6 {
  const subsections: LcSec6['subsections'] = {
    unifikovanyNazev: { total: 0, items: [] },
    nazevAuta:        { total: 0, items: [] },
    konfigurace:      { total: 0, items: [] },
    thuleSloupec:     { total: 0, items: [] },
    vlastnost:        { total: 0, items: [] },
  }
  let generatedAt: string | undefined
  let currentKey: keyof typeof subsections = 'unifikovanyNazev'

  for (const line of lines) {
    if (/vygenerováno/i.test(line)) {
      generatedAt = parseDateLine(line) ?? undefined
      continue
    }

    // #### subsection heading
    if (line.startsWith('#')) {
      const clean = line.replace(/^#+\s*/, '').toLowerCase().trim()
      for (const [pat, key] of Object.entries(THULE_SUBSECTION_MAP)) {
        if (clean.includes(pat)) { currentKey = key; break }
      }
      continue
    }

    // Total count line: "- celkem N záznamů"
    const celkemM = /celkem\s+([\d\s]+)\s+záznam/i.exec(line)
    if (celkemM) {
      subsections[currentKey].total = parseNum(celkemM[1])
      continue
    }

    // Item line: N  LANG,LANG,...  Typ  Název  [UUID](url)
    // Could be pipe-separated from table or space-separated
    let langs: string[] = []
    let itemType = ''
    let itemName = ''
    let itemUrl: string | undefined

    if (line.includes('|')) {
      const parts = line.split('|').map((s) => s.trim())
      // Parts: [num, langs, type, name, link] or variations
      if (parts.length >= 4) {
        const langPart = parts[1]
        langs = langPart.split(/[,\s]+/).filter((s) => /^[A-Z]{2}$/.test(s))
        itemType = parts[2]
        const nameAndLink = parts[3]
        const link = extractMdLink(nameAndLink)
        itemName = link.text
        itemUrl = link.url
        if (parts[4]) {
          const link2 = extractMdLink(parts[4])
          itemUrl = itemUrl || link2.url
        }
      }
    } else {
      // Space-separated: number  LANG1,LANG2,...  Type  Name  [link]
      const spaceM = /^\d+\s+([A-Z,]+)\s+(\S+(?:\s+\S+)*?)\s+\[([^\]]+)\]/.exec(line)
      if (spaceM) {
        langs = spaceM[1].split(',').filter((s) => /^[A-Z]{2}$/.test(s))
        // Try to split type and name (type is typically one or two words)
        const rest = spaceM[2]
        itemName = rest
        itemType = currentKey === 'unifikovanyNazev' ? 'Unifikovaný název' : ''
        const link = extractMdLink(line)
        itemUrl = link.url
      }
    }

    if (langs.length > 0 && (itemName || itemType)) {
      subsections[currentKey].items.push({ languages: langs, type: itemType, name: itemName, url: itemUrl })
    }
  }

  const total = Object.values(subsections).reduce((s, sb) => s + sb.total, 0)
  return { generatedAt, total, subsections }
}

// ---------------------------------------------------------------------------
// Block 7 — Šablony s nevyplněným vzorcem pro název
// ---------------------------------------------------------------------------

function parseLcSec7(lines: string[]): LcSec7 {
  const items: LcSec7Item[] = []
  let has_more = false

  for (const line of lines) {
    // Trailing ellipsis or "a další" → has_more
    if (/^\*+\s+\.\.\.|a další/i.test(line)) { has_more = true; continue }

    // * [Šablona](url) | Jazyky: bg, el, fi, hr
    const bulletM = /^\*+\s+(.+)$/.exec(line)
    if (!bulletM) continue

    const raw = bulletM[1]
    const pipeIdx = raw.indexOf('|')
    if (pipeIdx < 0) continue

    const namePart = raw.slice(0, pipeIdx).trim()
    const langPart = raw.slice(pipeIdx + 1).trim()

    const link = extractMdLink(namePart)
    const name = link.text
    const url = link.url

    // Parse "Jazyky: bg, el, fi, hr"
    const langM = /jazyky:\s*(.+)$/i.exec(langPart)
    const languages = langM
      ? langM[1].split(/[,\s]+/).filter((s) => /^[a-z]{2}$/i.test(s)).map((s) => s.toLowerCase())
      : []

    const isUnused = name.toUpperCase().includes('NEPOUŽÍVAT')
    items.push({ name, url, languages, isUnused })
  }

  return { total: items.length, items, has_more }
}

// ---------------------------------------------------------------------------
// KPI computation
// ---------------------------------------------------------------------------

function computeTextPct(sec4: LcSec4 | undefined): number {
  if (!sec4) return 0
  const sub = sec4.subsections.nazev
  let total = 0
  let generated = 0
  for (const cat of sub.categories) {
    for (const tv of Object.values(cat.languages)) {
      const catTotal = tv.generated + tv.missing + tv.manual + tv.machine + tv.api
      if (catTotal > 0) { total += catTotal; generated += tv.generated }
    }
  }
  if (total === 0) return 0
  return Math.round((generated / total) * 1000) / 10  // one decimal
}

function computeLcKPI(sections: ReportSections): ReportKPI {
  return {
    sec1_count: 0, sec4_count: 0, sec14_count: 0, sec13_count: 0, sec9_terms: 0,
    lc_sec1_count: sections.lc_sec1?.total,
    lc_sec2_count: sections.lc_sec2?.total,
    lc_sec3_unfilled: sections.lc_sec3?.total_unfilled,
    lc_sec4_pct: computeTextPct(sections.lc_sec4),
    lc_sec5_count: sections.lc_sec5?.nonzero_combos,
    lc_sec6_count: sections.lc_sec6?.total,
    lc_sec7_count: sections.lc_sec7?.total,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseLocalizationEmail(html: string, date: string, fetchedAt: string): Report {
  const lines = htmlToLines(html)

  if (!date) {
    for (const line of lines.slice(0, 15)) {
      const m = /(\d{2})-(\d{2})-(\d{4})/.exec(line)
      if (m) { date = `${m[3]}-${m[2]}-${m[1]}`; break }
    }
    date = date || new Date().toISOString().slice(0, 10)
  }

  const blocks = splitBlocks(lines)
  const sections: ReportSections = {}

  for (const block of blocks) {
    try {
      switch (block.num) {
        case 1: sections.lc_sec1 = parseLcSec1(block.lines); break
        case 2: sections.lc_sec2 = parseLcSec2(block.lines); break
        case 3: sections.lc_sec3 = parseLcSec3(block.lines); break
        case 4: sections.lc_sec4 = parseLcSec4(block.lines); break
        case 5: sections.lc_sec5 = parseLcSec5(block.lines); break
        case 6: sections.lc_sec6 = parseLcSec6(block.lines); break
        case 7: sections.lc_sec7 = parseLcSec7(block.lines); break
      }
    } catch (e) {
      console.error(`parseLocalization block ${block.num} error:`, e)
    }
  }

  const kpi = computeLcKPI(sections)
  return { date, reportType: 'localization', fetchedAt, kpi, sections }
}
