import * as cheerio from 'cheerio'
import type {
  Report, ReportKPI, ReportSections,
  MdSec1, MdSec1Kanal, MdSec1MaskItem,
  MdSec2, MdSec2Item,
  MdSec3, MdSec3Item,
  MdSec4, MdSec4SumarizaceRow, MdSec4UkolItem,
  MdSec5, MdSec5SablonaItem,
  MdSec6, MdSec6Strom, MdSec6KategorieItem,
  MdSec7, MdSec7OsobaGroup, MdSec7NazevItem,
  MdSec8, MdSec8Item,
  MdSec9,
  MdSec10, MdSec10NevyplneneItem, MdSec10NeprelozeneItem,
  MdSec11, MdSec11JazykGroup, MdSec11ProductItem,
  MdSec12, MdSec12Item,
} from '@/types/report'

// ---------------------------------------------------------------------------
// HTML → lines (with link preservation)
// ---------------------------------------------------------------------------

function htmlToLines(html: string): string[] {
  const $ = cheerio.load(html)

  // Preserve <a> links as [text](url) markdown before stripping HTML
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim()
    if (text && href) $(el).replaceWith(`[${text}](${href})`)
  })

  // Tables: each row → pipe-separated line
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

function parseCelkemN(line: string): number {
  const m = /celkem\s+([\d\s]+)\s+záznam/i.exec(line)
  if (m) return parseInt(m[1].replace(/\s/g, ''), 10)
  return 0
}

function parseNum(s: string): number {
  const n = parseInt(s.replace(/\s/g, '').replace(/[^\d]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

// ---------------------------------------------------------------------------
// Block splitting: ## N. Název bloku
// ---------------------------------------------------------------------------

interface MdBlock { num: number; title: string; lines: string[] }

function splitBlocks(lines: string[]): MdBlock[] {
  const blocks: MdBlock[] = []
  let current: MdBlock | null = null

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
// Block 1 — Neodpovídající produkty externím maskám
// ---------------------------------------------------------------------------

function parseMdSec1(lines: string[]): MdSec1 {
  const kanaly: MdSec1Kanal[] = []
  let current: MdSec1Kanal | null = null

  for (const line of lines) {
    // ### channelName (N ok / M chybových)
    const chanM = /^###\s+(\S+)/.exec(line)
    if (chanM) {
      const okM = /\((\d+)\s+ok\s*\/\s*(\d+)\s+chybových\)/i.exec(line)
      current = {
        kanal: chanM[1],
        ok_total: okM ? parseInt(okM[1], 10) : 0,
        chybovych_total: okM ? parseInt(okM[2], 10) : 0,
        masky: [],
      }
      kanaly.push(current)
      continue
    }
    if (!current) continue

    // N. [Šablona](url) | Název masky | Typ | Vlastnosti | **ok/chybových**
    const itemM = /^\d+\.\s+(.+)$/.exec(line)
    if (itemM) {
      const parts = itemM[1].split('|').map((s) => s.trim())
      if (parts.length >= 5) {
        const link = extractMdLink(parts[0])
        const scoreRaw = parts[parts.length - 1].replace(/\*\*/g, '')
        const scoreM = /(\d+)\s*\/\s*(\d+)/.exec(scoreRaw)
        current.masky.push({
          sablona: link.text,
          sablona_url: link.url,
          nazev_masky: parts[1],
          typ_produktu: parts[2],
          vlastnosti: parts[3].split(',').map((s) => s.trim()).filter(Boolean),
          ok: scoreM ? parseInt(scoreM[1], 10) : 0,
          chybovych: scoreM ? parseInt(scoreM[2], 10) : 0,
        })
      }
    }
  }

  const chybovych_total = kanaly.reduce((s, k) => s + k.chybovych_total, 0)
  const ok_total = kanaly.reduce((s, k) => s + k.ok_total, 0)
  return { chybovych_total, ok_total, kanaly }
}

// ---------------------------------------------------------------------------
// Block 2 — Neodpovídající produkty masce variantních vlastností
// ---------------------------------------------------------------------------

function parseMdSec2(lines: string[]): MdSec2 {
  const items: MdSec2Item[] = []

  for (const line of lines) {
    const m = /^\d+\.\s+(.+)$/.exec(line)
    if (!m) continue
    const parts = m[1].split('|').map((s) => s.trim())
    if (parts.length < 4) continue
    const link = extractMdLink(parts[0])
    const id = link.text
    items.push({
      id,
      id_url: link.url || `https://admin.sportega.cz/products/${id}`,
      nazev: parts[1],
      typ: parts[2],
      vlastnost: parts[3],
      hodnoty: parts[4] ? parts[4].split(',').map((s) => s.trim()).filter(Boolean) : [],
    })
  }

  const byTyp: Record<string, number> = {}
  const byVlastnost: Record<string, number> = {}
  for (const item of items) {
    const t = item.typ || 'Neznámý'
    byTyp[t] = (byTyp[t] || 0) + 1
    const v = item.vlastnost || 'Neznámá'
    byVlastnost[v] = (byVlastnost[v] || 0) + 1
  }

  return { total: items.length, items, stats: { byTyp, byVlastnost } }
}

// ---------------------------------------------------------------------------
// Block 3 — Unifikované názvy NEPOUŽÍVANÉ
// ---------------------------------------------------------------------------

function parseMdSec3(lines: string[]): MdSec3 {
  const items: MdSec3Item[] = []
  let total = 0

  for (const line of lines) {
    const celkemM = parseCelkemN(line)
    if (celkemM) { total = celkemM; continue }

    const m = /^\d+\.\s+(.+?)\s*\|\s*(\d+)\s*$/.exec(line)
    if (m) items.push({ nazev: m[1].trim(), pocet: parseInt(m[2], 10) })
  }

  return { total: total || items.length, items }
}

// ---------------------------------------------------------------------------
// Block 4 — MDM workflow
// ---------------------------------------------------------------------------

function parseMdSec4(lines: string[]): MdSec4 {
  const sumarizace: MdSec4SumarizaceRow[] = []
  const ukoly: MdSec4UkolItem[] = []

  // Column order in summary table
  const COL_ORDER = ['sablona', 'vlastnost', 'modelova_rada', 'znacka', 'externi_maska', 'textovy_vzorec', 'technologie', 'zastupny_text'] as const

  let inUkoly = false

  for (const line of lines) {
    if (/otevřené\s+úkol/i.test(line)) { inUkoly = true; continue }
    // Skip header rows
    if (/šablona.*vlastnost|vlastnost.*šablona/i.test(line)) continue

    if (inUkoly) {
      // ID | **Řešitel** | TYP | [Entita](url) | Zadavatel | Termin | stav
      const parts = line.split('|').map((s) => s.trim())
      if (parts.length >= 6) {
        const id = parts[0].replace(/\*\*/g, '').trim()
        if (!id || /^id$/i.test(id) || /^\s*#/.test(id)) continue
        const resitel = parts[1].replace(/\*\*/g, '').trim()
        const typ = parts[2].trim()
        const entityLink = extractMdLink(parts[3])
        const zadavatel = parts[4].trim()
        const terminRaw = parts[5].trim()
        const stavRaw = parts[6]?.replace(/\*\*/g, '').trim().toLowerCase() || 'todo'

        // Parse date DD-MM-YYYY HH:MM:SS or DD.MM.YYYY
        let termin = terminRaw
        const dateM = /(\d{2})[-.](\d{2})[-.](\d{4})/.exec(terminRaw)
        if (dateM) termin = `${dateM[3]}-${dateM[2]}-${dateM[1]}`

        const stav = stavRaw === 'inprogress' ? 'inprogress' : 'todo'
        ukoly.push({ id, resitel, typ, entita: entityLink.text, entita_url: entityLink.url, zadavatel, termin, stav })
      }
    } else {
      // Summary row: Jméno | 0 | 0 | 0 | 0 | 0 | 15 | 6 | 0
      const parts = line.split('|').map((s) => s.replace(/\*\*/g, '').trim())
      if (parts.length >= 9) {
        const resitel = parts[0]
        if (!resitel || /šablona|vlastnost|modelová/i.test(resitel)) continue
        const vals = parts.slice(1, 9).map((p) => parseNum(p))
        const row = { resitel, celkem: vals.reduce((s, v) => s + v, 0) } as MdSec4SumarizaceRow
        COL_ORDER.forEach((col, i) => { (row as unknown as Record<string, number>)[col] = vals[i] || 0 })
        sumarizace.push(row)
      }
    }
  }

  return { total: ukoly.length, sumarizace, ukoly }
}

// ---------------------------------------------------------------------------
// Block 5 — Nesplnění kvality dat
// ---------------------------------------------------------------------------

function parseMdSec5(lines: string[]): MdSec5 {
  const sablony: MdSec5SablonaItem[] = []
  let current: MdSec5SablonaItem | null = null
  let total = 0

  for (const line of lines) {
    const celkemM = parseCelkemN(line)
    if (celkemM) { total = celkemM; continue }

    // Numbered = šablona heading
    const numM = /^\d+\.\s+(.+)$/.exec(line)
    if (numM) {
      const link = extractMdLink(numM[1])
      current = { sablona: link.text, sablona_url: link.url, nazvy: [] }
      sablony.push(current)
      continue
    }

    // Bullet = unif. název under current šablona
    const bulletM = /^\*+\s+(.+)$/.exec(line)
    if (bulletM && current) {
      current.nazvy.push(bulletM[1].trim())
    }
  }

  return { total: total || sablony.reduce((s, sb) => s + sb.nazvy.length, 0), sablony }
}

// ---------------------------------------------------------------------------
// Block 6 — Kategorie
// ---------------------------------------------------------------------------

function parseMdSec6(lines: string[]): MdSec6 {
  const stromy: MdSec6Strom[] = []
  let current: MdSec6Strom | null = null
  let total = 0

  for (const line of lines) {
    const celkemM = parseCelkemN(line)
    if (celkemM) { total = celkemM; continue }

    // Bullet = strom (top-level category group)
    const bulletM = /^\*+\s+(.+)$/.exec(line)
    if (bulletM) {
      const link = extractMdLink(bulletM[1])
      current = { nazev: link.text, url: link.url, kategorie: [] }
      stromy.push(current)
      continue
    }

    if (!current) continue

    // Numbered = kategorie: N. [name](url) , typ, stav, X/Y
    const numM = /^\d+\.\s+(.+)$/.exec(line)
    if (numM) {
      const raw = numM[1]
      const link = extractMdLink(raw)
      const xyM = /(\d+)\/(\d+)/.exec(raw)

      // Parse remaining attributes after link part
      const afterLink = raw.replace(/\[[^\]]+\]\([^)]+\)/, '')
      let typ: MdSec6KategorieItem['typ'] = 'nekoncova'
      let stav: MdSec6KategorieItem['stav'] = 'zapnuto'
      if (/\bkoncová\b|\bkoncova\b/i.test(afterLink)) typ = 'koncova'
      if (/\bnekoncová\b|\bnekoncova\b/i.test(afterLink)) typ = 'nekoncova'
      if (/\bzapnuto\b/i.test(afterLink)) stav = 'zapnuto'
      if (/\bvypnuto\b/i.test(afterLink)) stav = 'vypnuto'

      current.kategorie.push({
        nazev: link.text,
        url: link.url,
        typ,
        stav,
        splnuji: xyM ? parseInt(xyM[1], 10) : 0,
        celkem: xyM ? parseInt(xyM[2], 10) : 0,
      })
    }
  }

  return { total: total || stromy.reduce((s, st) => s + st.kategorie.length, 0), stromy }
}

// ---------------------------------------------------------------------------
// Block 7 — Nezadané prodejní období
// ---------------------------------------------------------------------------

function parseMdSec7(lines: string[]): MdSec7 {
  const osoby: MdSec7OsobaGroup[] = []
  let current: MdSec7OsobaGroup | null = null

  for (const line of lines) {
    // Bullet with bold text = person header:
    // * ** - - celkem N záznamů** or * ** Jméno - celkem N záznamů**
    const headerM = /^\*+\s*\*{1,2}\s*(.*?)\s*[-–]\s*celkem\s+(\d+)\s+záznam/i.exec(line)
    if (headerM) {
      const rawName = headerM[1].replace(/\*+/g, '').trim()
      const osoba = rawName === '-' || rawName === '' ? '-' : rawName
      current = { osoba, pocet: parseInt(headerM[2], 10), nazvy: [] }
      osoby.push(current)
      continue
    }

    if (!current) continue

    // Numbered item: N. Název - DD. MM. - DD. MM. [, DD. MM. - DD. MM.]
    const numM = /^\d+\.\s+(.+)$/.exec(line)
    if (numM) {
      const raw = numM[1].trim()
      // Extract all period ranges: DD. MM. - DD. MM.
      const periodRe = /\d{1,2}\.\s*\d{1,2}\.?\s*[-–]\s*\d{1,2}\.\s*\d{1,2}\.?/g
      const periods: string[] = []
      let pm
      while ((pm = periodRe.exec(raw)) !== null) {
        periods.push(pm[0].replace(/\s+/g, ''))
      }
      // Name = everything before first period
      const firstPeriodIdx = raw.search(/\d{1,2}\.\s*\d{1,2}/)
      const nazev = (firstPeriodIdx > 0 ? raw.slice(0, firstPeriodIdx) : raw)
        .replace(/[-–]\s*$/, '')
        .trim()
      current.nazvy.push({ nazev, obdobi: periods })
    }
  }

  const total = osoby.reduce((s, o) => s + o.pocet, 0)
  return { total, osoby }
}

// ---------------------------------------------------------------------------
// Blocks 8 & 9 — Kombinace bez textového vzorce / bez ext. masky
// ---------------------------------------------------------------------------

function parseMdSec89(lines: string[]): MdSec8 {
  const items: MdSec8Item[] = []
  let total = 0

  for (const line of lines) {
    const celkemM = parseCelkemN(line)
    if (celkemM) { total = celkemM; continue }

    // N. Šablona - Unif. název | N
    const m = /^\d+\.\s+(.+?)\s+-\s+(.+?)\s*\|\s*(\d+)\s*$/.exec(line)
    if (m) {
      items.push({ sablona: m[1].trim(), unif_nazev: m[2].trim(), pocet: parseInt(m[3], 10) })
    }
  }

  const bySablona: Record<string, number> = {}
  for (const item of items) {
    bySablona[item.sablona] = (bySablona[item.sablona] || 0) + item.pocet
  }

  return { total: total || items.length, items, stats: { bySablona } }
}

// ---------------------------------------------------------------------------
// Block 10 — Zástupné texty vlastností nevyplněno
// ---------------------------------------------------------------------------

function parseMdSec10(lines: string[]): MdSec10 {
  const nevyplnene: MdSec10NevyplneneItem[] = []
  const neprelozene: MdSec10NeprelozeneItem[] = []
  let nevyplnene_total = 0
  let neprelozene_total = 0
  let inNeprelozene = false

  for (const line of lines) {
    if (/nepřeložené|neprelozene/i.test(line)) { inNeprelozene = true; continue }

    const celkemM = parseCelkemN(line)
    if (celkemM) {
      if (inNeprelozene) neprelozene_total = celkemM
      else nevyplnene_total = celkemM
      continue
    }

    // Both sections have pipe-separated rows
    const parts = line.split('|').map((s) => s.trim())
    if (parts.length < 3) continue
    // First col may be a line number (digits only)
    const startIdx = /^\d+$/.test(parts[0]) ? 1 : 0

    if (inNeprelozene) {
      // [Šablona](url) | Vlastnost | Jazyky
      if (parts.length < startIdx + 3) continue
      const link = extractMdLink(parts[startIdx])
      const vlastnost = parts[startIdx + 1]
      const jazykyRaw = parts[startIdx + 2]
      if (!link.text || !vlastnost) continue
      const jazyky = jazykyRaw.split(/[,\s]+/).filter((s) => /^[a-z]{2}$/i.test(s))
      neprelozene.push({ sablona: link.text, sablona_url: link.url, vlastnost, jazyky })
    } else {
      // [Šablona](url) | Unif. název | Vlastnost | Hodnoty...
      if (parts.length < startIdx + 4) continue
      const link = extractMdLink(parts[startIdx])
      const unif_nazev = parts[startIdx + 1]
      const vlastnost = parts[startIdx + 2]
      const hodnotyRaw = parts.slice(startIdx + 3).join(',')
      if (!link.text || !unif_nazev || !vlastnost) continue
      const hodnoty = hodnotyRaw.split(',').map((s) => s.trim()).filter(Boolean)
      nevyplnene.push({ sablona: link.text, sablona_url: link.url, unif_nazev, vlastnost, hodnoty })
    }
  }

  return {
    nevyplnene_total: nevyplnene_total || nevyplnene.length,
    neprelozene_total: neprelozene_total || neprelozene.length,
    nevyplnene,
    neprelozene,
  }
}

// ---------------------------------------------------------------------------
// Block 11 — Produkty s nevygenerovaným názvem
// ---------------------------------------------------------------------------

function parseMdSec11(lines: string[]): MdSec11 {
  const jazyky: MdSec11JazykGroup[] = []
  let current: MdSec11JazykGroup | null = null

  for (const line of lines) {
    // ### jazyk (cs, bg, …)
    const langM = /^###\s+([a-z]{2})$/i.exec(line)
    if (langM) {
      current = { jazyk: langM[1].toLowerCase(), total: 0, produkty: [] }
      jazyky.push(current)
      continue
    }

    if (!current) continue

    const celkemM = parseCelkemN(line)
    if (celkemM) { current.total = celkemM; continue }

    // N. [ID](url) | Název | stav | skupinaId | skupinaNazev
    const numM = /^\d+\.\s+(.+)$/.exec(line)
    if (numM) {
      const parts = numM[1].split('|').map((s) => s.trim())
      if (parts.length < 4) continue
      const link = extractMdLink(parts[0])
      const id = link.text
      current.produkty.push({
        id,
        id_url: link.url || `https://admin.sportega.cz/products/${id}`,
        nazev: parts[1],
        stav: (parts[2] as 'saleable' | 'unsaleable') || 'saleable',
        skupina_id: parts[3],
        skupina_nazev: parts[4] || '',
      })
    }
  }

  // Fill total from produkty count if celkem not found
  for (const g of jazyky) {
    if (!g.total) g.total = g.produkty.length
  }

  const cs_count = jazyky.find((g) => g.jazyk === 'cs')?.total ?? 0
  return { cs_count, jazyky }
}

// ---------------------------------------------------------------------------
// Block 12 — Produkty "saleable" bez kategorie
// ---------------------------------------------------------------------------

function parseMdSec12(lines: string[]): MdSec12 {
  const items: MdSec12Item[] = []
  let total = 0

  for (const line of lines) {
    const celkemM = parseCelkemN(line)
    if (celkemM) { total = celkemM; continue }

    // * [ID](url) | Název | stav | skupinaId | skupinaNazev
    const bulletM = /^\*+\s+(.+)$/.exec(line)
    if (bulletM) {
      const parts = bulletM[1].split('|').map((s) => s.trim())
      if (parts.length < 4) continue
      const link = extractMdLink(parts[0])
      const id = link.text
      items.push({
        id,
        id_url: link.url || `https://admin.sportega.cz/products/${id}`,
        nazev: parts[1],
        stav: parts[2],
        skupina_id: parts[3],
        skupina_nazev: parts[4] || '',
      })
    }
  }

  return { total: total || items.length, items }
}

// ---------------------------------------------------------------------------
// KPI computation
// ---------------------------------------------------------------------------

function computeMdKPI(sections: ReportSections): ReportKPI {
  return {
    sec1_count: 0,
    sec4_count: 0,
    sec14_count: 0,
    sec13_count: 0,
    sec9_terms: 0,
    md_sec1_errors: sections.md_sec1?.chybovych_total,
    md_sec2_count: sections.md_sec2?.total,
    md_sec3_count: sections.md_sec3?.total,
    md_sec4_count: sections.md_sec4?.total,
    md_sec5_count: sections.md_sec5?.total,
    md_sec6_count: sections.md_sec6?.total,
    md_sec7_count: sections.md_sec7?.total,
    md_sec8_count: sections.md_sec8?.total,
    md_sec9_count: sections.md_sec9?.total,
    md_sec10_count: sections.md_sec10?.nevyplnene_total,
    md_sec10b_count: sections.md_sec10?.neprelozene_total,
    md_sec11_count: sections.md_sec11?.cs_count,
    md_sec12_count: sections.md_sec12?.total,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseMasterdataEmail(html: string, date: string, fetchedAt: string): Report {
  const lines = htmlToLines(html)

  // Try to extract date from report if not provided
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
        case 1:  sections.md_sec1  = parseMdSec1(block.lines);  break
        case 2:  sections.md_sec2  = parseMdSec2(block.lines);  break
        case 3:  sections.md_sec3  = parseMdSec3(block.lines);  break
        case 4:  sections.md_sec4  = parseMdSec4(block.lines);  break
        case 5:  sections.md_sec5  = parseMdSec5(block.lines);  break
        case 6:  sections.md_sec6  = parseMdSec6(block.lines);  break
        case 7:  sections.md_sec7  = parseMdSec7(block.lines);  break
        case 8:  sections.md_sec8  = parseMdSec89(block.lines); break
        case 9:  sections.md_sec9  = parseMdSec89(block.lines); break
        case 10: sections.md_sec10 = parseMdSec10(block.lines); break
        case 11: sections.md_sec11 = parseMdSec11(block.lines); break
        case 12: sections.md_sec12 = parseMdSec12(block.lines); break
      }
    } catch (e) {
      console.error(`parseMasterdata block ${block.num} error:`, e)
    }
  }

  const kpi = computeMdKPI(sections)
  return { date, reportType: 'masterdata', fetchedAt, kpi, sections }
}
