import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import type { Element } from 'domhandler'
import type {
  Report, ReportKPI, ReportSections,
  SkSec1, SkSec1Balik,
  SkSec2,
  SkSec3, SkSec3Item,
  SkSec4, SkSec4Item,
  SkSec5, SkSecUkolItem,
  SkSec6,
  SkSec7, SkSec7Item,
  SkSec8, SkSec8Item,
} from '@/types/report'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse datetime in warehouse format: HH:MM:SS/DD.MM.YYYY → ISO datetime string */
function parseWareDate(s: string): string | undefined {
  const m = /(\d{2}):(\d{2}):(\d{2})\/(\d{2})\.(\d{2})\.(\d{4})/.exec(s.trim())
  if (!m) return undefined
  const [, hh, mm, ss, dd, mo, yyyy] = m
  return `${yyyy}-${mo}-${dd}T${hh}:${mm}:${ss}`
}

/** Extract markdown-style link: [text](url) → { text, url } */
function extractMdLink(s: string): { text: string; url?: string } {
  const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(s)
  if (m) return { text: m[1], url: m[2] }
  return { text: s, url: undefined }
}

/** Convert HTML to plain text lines, handling <br> as line separators */
function htmlToLines(html: string): string[] {
  const $ = cheerio.load(html)

  // Tables: convert each row to pipe-separated line to preserve table structure
  $('table').each((_, table) => {
    const rows: string[] = []
    $(table).find('tr').each((_, tr) => {
      const cells: string[] = []
      $(tr).find('td, th').each((_, td) => { cells.push($(td).text().trim()) })
      if (cells.length) rows.push(cells.join(' | '))
    })
    $(table).replaceWith(rows.join('\n'))
  })

  // Replace block-level elements with newlines
  $('br').replaceWith('\n')
  $('p, div, li').each((_, el) => { $(el).after('\n') })
  $('h1, h2, h3, h4, h5, h6').each((_, el) => { $(el).after('\n') })

  const rawText = $('body').text()
  return rawText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Section detection
// ---------------------------------------------------------------------------

const SECTION_PATTERNS: { sec: number; pattern: RegExp }[] = [
  { sec: 1, pattern: /provizorní balík/i },
  { sec: 2, pattern: /nepodané balík[ůy].*čp|balíky.*č\.\s*p\.|balíky.*česk\./i },
  { sec: 3, pattern: /objednávk[yi].*front[ae]|front[ae].*objednávk/i },
  { sec: 4, pattern: /rozpracované převodk/i },
  { sec: 5, pattern: /úkol[ůy].*šarž/i },
  { sec: 6, pattern: /úkol[ůy].*kas[ei]|kasa.*úkol/i },
  { sec: 7, pattern: /korekc[ei].*posledn|počty? korekc/i },
  { sec: 8, pattern: /blokac[ei].*pult/i },
]

function detectSection(line: string): number | null {
  // Strip Markdown heading prefix
  const clean = line.replace(/^#+\s*/, '').trim()
  for (const { sec, pattern } of SECTION_PATTERNS) {
    if (pattern.test(clean)) return sec
  }
  return null
}

interface SectionChunk { sec: number; lines: string[] }

function splitIntoSections(lines: string[]): SectionChunk[] {
  const sections: SectionChunk[] = []
  let currentSec: number | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    // Consider as heading candidate if it starts with # OR is short and matches a known section
    const isMarkdownHeading = line.startsWith('#')
    const sec = (isMarkdownHeading || line.length < 80) ? detectSection(line) : null

    if (sec !== null) {
      if (currentSec !== null) sections.push({ sec: currentSec, lines: currentLines })
      currentSec = sec
      currentLines = []
    } else if (currentSec !== null) {
      currentLines.push(line)
    }
  }

  if (currentSec !== null) sections.push({ sec: currentSec, lines: currentLines })
  return sections
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

function parseSkSec1(lines: string[]): SkSec1 {
  const baliky: SkSec1Balik[] = []
  const byDuvod: Record<string, number> = {}
  const byDopravce: Record<string, number> = {}

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // "Balík pro objednávku č. [ID](url) (dopravce) - stav"
    // also handle plain text (no markdown link): "Balík pro objednávku č. 2600121652 (dopravce) - stav"
    const mainM = /Balík pro objednávku č\.\s*(?:\[(\d+)\]\(([^)]+)\)|(\d+))\s*\(([^)]+)\)\s*-\s*(.+)$/i.exec(line)
    if (mainM) {
      const objednavka = mainM[1] || mainM[3] || ''
      const balik: SkSec1Balik = {
        objednavka,
        objednavka_url: mainM[2] || undefined,
        dopravce: mainM[4].trim(),
        stav: mainM[5].trim(),
        duvod: '',
        odpovida: '',
      }

      i++
      while (i < lines.length && (lines[i].startsWith('-') || lines[i].startsWith('–'))) {
        const sub = lines[i].replace(/^[-–]\s*/, '')

        // "Vytvořen HH:MM:SS/DD.MM.YYYY | provizorně uzavřen HH:MM:SS/DD.MM.YYYY | důvod TEXT"
        const dateM = /Vytvořen\s+([^|]+)\|\s*provizorně uzavřen\s+([^|]+)\|\s*důvod\s+(.+)/i.exec(sub)
        if (dateM) {
          balik.vytvoreno = parseWareDate(dateM[1])
          balik.uzavreno = parseWareDate(dateM[2])
          balik.duvod = dateM[3].trim()
          if (balik.vytvoreno && balik.uzavreno) {
            const diff = (new Date(balik.uzavreno).getTime() - new Date(balik.vytvoreno).getTime()) / 60000
            if (diff >= 0) balik.prodleva_min = Math.round(diff)
          }
        }

        // "Odpovídá: CC"
        const odpM = /Odpovídá:\s*(.+)/i.exec(sub)
        if (odpM) balik.odpovida = odpM[1].trim()

        i++
      }

      baliky.push(balik)
      continue
    }

    // Statistics lines
    // "Statistika důvodu...: - Neznámá chyba: 2 - Jiný důvod: 1"
    if (/statistika důvodu/i.test(line)) {
      const after = line.replace(/^statistika důvodu[^:]*:\s*/i, '')
      for (const part of after.split(/\s*-\s*/)) {
        const m = /^(.+?):\s*(\d+)$/.exec(part.trim())
        if (m) byDuvod[m[1].trim()] = parseInt(m[2])
      }
    } else if (/statistika dopravců/i.test(line)) {
      const after = line.replace(/^statistika dopravců[^:]*:\s*/i, '')
      for (const part of after.split(/\s*-\s*/)) {
        const m = /^(.+?):\s*(\d+)$/.exec(part.trim())
        if (m) byDopravce[m[1].trim()] = parseInt(m[2])
      }
    }

    i++
  }

  return { total: baliky.length, baliky, stats: { byDuvod, byDopravce } }
}

function parseSkSec2(lines: string[]): SkSec2 {
  let total = 0
  let nejstarsi: string | undefined

  for (const line of lines) {
    const celkemM = /^Celkem\s+(\d+)\s+balík/i.exec(line)
    if (celkemM) { total = parseInt(celkemM[1]); continue }

    const nejstarsiM = /^Nejstarší z\s+(.+)/i.exec(line)
    if (nejstarsiM && nejstarsiM[1].trim() !== '-') {
      nejstarsi = parseWareDate(nejstarsiM[1]) ?? nejstarsiM[1].trim()
    }
  }

  return { total, nejstarsi }
}

function parseSkSec3(lines: string[]): SkSec3 {
  const skladMap = new Map<string, { k_hledani: number; k_baleni: number }>()
  let total = 0, k_hledani = 0, k_baleni = 0

  for (const line of lines) {
    // "Sklad: Centrální sklad Šlapanice k balení: počet: 319"
    const skladM = /^Sklad:\s*(.+?)\s+k\s+(balení|hledání):\s*počet:\s*(\d+)/i.exec(line)
    if (skladM) {
      const sklad = skladM[1].trim()
      const typ = skladM[2] === 'balení' ? 'k_baleni' : 'k_hledani'
      const count = parseInt(skladM[3])
      if (!skladMap.has(sklad)) skladMap.set(sklad, { k_hledani: 0, k_baleni: 0 })
      const entry = skladMap.get(sklad)!
      entry[typ] += count
      continue
    }

    // "Celkem 1535, z toho k hledání 1216 a k balení 319"
    const celkemM = /^Celkem\s+(\d+),\s*z toho k hledání\s+(\d+)\s+a k balení\s+(\d+)/i.exec(line)
    if (celkemM) {
      total = parseInt(celkemM[1])
      k_hledani = parseInt(celkemM[2])
      k_baleni = parseInt(celkemM[3])
    }
  }

  const sklady: SkSec3Item[] = Array.from(skladMap.entries()).map(([sklad, d]) => ({
    sklad,
    k_hledani: d.k_hledani,
    k_baleni: d.k_baleni,
    celkem: d.k_hledani + d.k_baleni,
  }))

  if (!total) total = sklady.reduce((s, sk) => s + sk.celkem, 0)
  if (!k_hledani) k_hledani = sklady.reduce((s, sk) => s + sk.k_hledani, 0)
  if (!k_baleni) k_baleni = sklady.reduce((s, sk) => s + sk.k_baleni, 0)

  return { total, k_hledani, k_baleni, sklady }
}

function parseSkSec4(lines: string[]): SkSec4 {
  const items: SkSec4Item[] = []

  for (const line of lines) {
    // "[22PREVOD07567](url) (vytvořeno HH:MM:SS/DD.MM.YYYY) Sklad Z -> Sklad DO"
    const m = /^\[([^\]]+)\]\(([^)]+)\)\s*\(vytvořeno\s+([^)]+)\)\s*(.+?)\s*->\s*(.+)$/.exec(line)
    if (m) {
      items.push({
        id: m[1].trim(),
        id_url: m[2].trim(),
        vytvoreno: parseWareDate(m[3]),
        ze: m[4].trim(),
        do: m[5].trim(),
      })
      continue
    }

    // Plain text fallback (no markdown link): "22PREVOD07567 (vytvořeno ...) Sklad Z -> Sklad DO"
    const m2 = /^(\S+)\s*\(vytvořeno\s+([^)]+)\)\s*(.+?)\s*->\s*(.+)$/.exec(line)
    if (m2) {
      items.push({
        id: m2[1].trim(),
        vytvoreno: parseWareDate(m2[2]),
        ze: m2[3].trim(),
        do: m2[4].trim(),
      })
    }
  }

  return { total: items.length, items }
}

function parseSkSecUkoly(lines: string[]): SkSec5 {
  const items: SkSecUkolItem[] = []

  for (const line of lines) {
    // "Sklad Centrální sklad Šlapanice: celkem 95 úkolů, nejstarší z HH:MM:SS/DD.MM.YYYY"
    const m = /^Sklad\s+(.+?):\s*celkem\s+(\d+)\s+úkolů,\s*nejstarší z\s+(.+)$/i.exec(line)
    if (m) {
      items.push({
        sklad: m[1].trim(),
        pocet: parseInt(m[2]),
        nejstarsi: parseWareDate(m[3]),
      })
    }
  }

  return { total: items.reduce((s, i) => s + i.pocet, 0), items }
}

function parseSkSec7(lines: string[]): SkSec7 {
  const items: SkSec7Item[] = []
  let total = 0
  let odkaz: string | undefined
  let inTable = false

  for (const line of lines) {
    if (!line.includes('|')) {
      // "Celkem N" or "Celkem N [link](url)"
      const celkemM = /^Celkem\s+(\d+)/i.exec(line)
      if (celkemM) {
        total = parseInt(celkemM[1])
        const linkM = /\(([^)]+)\)/.exec(line)
        if (linkM && linkM[1].startsWith('http')) odkaz = linkM[1]
        const mdLinkM = /\[[^\]]*\]\(([^)]+)\)/.exec(line)
        if (mdLinkM) odkaz = mdLinkM[1]
      }
      continue
    }

    const parts = line.split('|').map((s) => s.trim())
    if (parts.length < 3) continue

    // Header row detection
    if (/kategori/i.test(parts[0]) && /korekce/i.test(parts[1])) {
      inTable = true
      continue
    }

    if (inTable && parts[0] && !/^[\s-]+$/.test(parts[0])) {
      const plus = parseInt(parts[1]) || 0
      const minus = parseInt(parts[2]) || 0
      items.push({ kategorie: parts[0], plus, minus, celkem: plus + minus })
    }
  }

  if (!total) total = items.reduce((s, i) => s + i.celkem, 0)

  return { total, items, odkaz }
}

function parseSkSec8(lines: string[]): SkSec8 {
  const items: SkSec8Item[] = []
  let inTable = false

  for (const line of lines) {
    if (!line.includes('|')) continue

    const parts = line.split('|').map((s) => s.trim())
    if (parts.length < 7) continue

    // Header row
    if (/pult/i.test(parts[0]) && /uživatel/i.test(parts[1])) {
      inTable = true
      continue
    }
    // Separator row (--- | --- | ...)
    if (/^-+$/.test(parts[0])) continue

    if (!inTable) continue

    const [pultRaw, pracovnik, casBlokaceRaw, zbozi, doklad, odblokoval, casOdblRaw] = parts

    const pult = (pultRaw === '—' || pultRaw === '-' || !pultRaw) ? '' : pultRaw

    // Extract product name and code: "Dámské šortky Wilson… / 1419873"
    const lastSlashIdx = zbozi.lastIndexOf(' / ')
    const produkt_nazev = lastSlashIdx >= 0 ? zbozi.substring(0, lastSlashIdx).trim() : zbozi
    const produkt_kod = lastSlashIdx >= 0 ? zbozi.substring(lastSlashIdx + 3).trim() : ''

    const cas_blokace = parseWareDate(casBlokaceRaw) ?? casBlokaceRaw
    const isStillLocked = !casOdblRaw || casOdblRaw === '—' || casOdblRaw === '-'
    const cas_odblokovani = isStillLocked ? undefined : (parseWareDate(casOdblRaw) ?? casOdblRaw)

    let doba_blokace_min: number | undefined
    if (cas_blokace && cas_odblokovani) {
      const diff = (new Date(cas_odblokovani).getTime() - new Date(cas_blokace).getTime()) / 60000
      if (diff > 0) doba_blokace_min = Math.round(diff)
    }

    items.push({
      pult,
      pracovnik,
      cas_blokace,
      produkt_nazev,
      produkt_kod: (produkt_kod === '—' || produkt_kod === '-') ? '' : produkt_kod,
      doklad,
      odblokoval: (odblokoval === '—' || odblokoval === '-') ? '' : odblokoval,
      cas_odblokovani,
      doba_blokace_min,
    })
  }

  const byPracovnik: Record<string, number> = {}
  const byPult: Record<string, number> = {}

  for (const item of items) {
    const p = item.pracovnik || 'Neznámý'
    byPracovnik[p] = (byPracovnik[p] || 0) + 1
    const pu = item.pult || 'Neznámý pult'
    byPult[pu] = (byPult[pu] || 0) + 1
  }

  const odblokowane = items.filter((i) => i.doba_blokace_min !== undefined)
  const avg_doba_min = odblokowane.length > 0
    ? Math.round(odblokowane.reduce((s, i) => s + (i.doba_blokace_min || 0), 0) / odblokowane.length)
    : undefined

  return { total: items.length, items, stats: { byPracovnik, byPult, avg_doba_min } }
}

// ---------------------------------------------------------------------------
// KPI computation
// ---------------------------------------------------------------------------

function computeSkladovyKPI(sections: ReportSections): ReportKPI {
  return {
    // Required obchodní fields must be present (0 for warehouse reports)
    sec1_count: 0,
    sec4_count: 0,
    sec14_count: 0,
    sec13_count: 0,
    sec9_terms: 0,
    // Warehouse KPIs
    sk_sec1_count: sections.sk_sec1?.total ?? 0,
    sk_sec2_count: sections.sk_sec2?.total ?? 0,
    sk_sec3_count: sections.sk_sec3?.total ?? 0,
    sk_sec4_count: sections.sk_sec4?.total ?? 0,
    sk_sec5_count: sections.sk_sec5?.total ?? 0,
    sk_sec6_count: sections.sk_sec6?.total ?? 0,
    sk_sec7_count: sections.sk_sec7?.total ?? 0,
    sk_sec8_count: sections.sk_sec8?.total ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseSkladovyEmail(html: string, date: string, fetchedAt: string): Report {
  const lines = htmlToLines(html)
  const chunks = splitIntoSections(lines)

  const sections: ReportSections = {}

  for (const { sec, lines: secLines } of chunks) {
    try {
      switch (sec) {
        case 1: sections.sk_sec1 = parseSkSec1(secLines); break
        case 2: sections.sk_sec2 = parseSkSec2(secLines); break
        case 3: sections.sk_sec3 = parseSkSec3(secLines); break
        case 4: sections.sk_sec4 = parseSkSec4(secLines); break
        case 5: sections.sk_sec5 = parseSkSecUkoly(secLines); break
        case 6: sections.sk_sec6 = parseSkSecUkoly(secLines); break
        case 7: sections.sk_sec7 = parseSkSec7(secLines); break
        case 8: sections.sk_sec8 = parseSkSec8(secLines); break
      }
    } catch (e) {
      console.error(`parseSkladovyEmail sec${sec} error:`, e)
    }
  }

  return {
    date,
    reportType: 'skladovy',
    fetchedAt,
    kpi: computeSkladovyKPI(sections),
    sections,
  }
}
