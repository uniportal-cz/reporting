export interface ReportIndex {
  reports: { date: string; reportType: string; kpi: ReportKPI }[]
}

export interface ReportKPI {
  sec1_count: number       // Zapnutý v doprodeji bez zásoby
  sec4_count: number       // Nelze doručit (unikátní produkty)
  sec14_count: number      // Záporná marže
  sec13_count: number      // Saleable bez kategorie
  sec9_terms: number       // Termínů likvidace
  // Extended — optional for backward compat
  sec2_count?: number
  sec3_count?: number
  sec5_count?: number
  sec6_count?: number
  sec7_count?: number
  sec8_count?: number
  sec9_count?: number
  sec10_count?: number
  sec11_count?: number
  sec12_count?: number
  sec15_count?: number
}

export interface Report {
  date: string             // YYYY-MM-DD
  reportType: string       // e.g. 'obchodni'
  fetchedAt: string        // ISO timestamp
  kpi: ReportKPI
  sections: ReportSections
}

export interface ReportSections {
  sec1?: Section1
  sec2?: Section2
  sec3?: Section3
  sec4?: Section4
  sec5?: Section5
  sec6?: Section6
  sec7?: Section7
  sec8?: Section8
  sec9?: Section9
  sec10?: Section10
  sec11?: Section11
  sec12?: Section12
  sec13?: Section13
  sec14?: Section14
  sec15?: Section15
}

// Sec 1: Zapnutý v doprodeji bez zásoby
export interface Section1 {
  total: number
  sample: { id: string; typ: string; nazev: string; skupina_id: string; skupina_nazev: string; admin: string; url?: string }[]
  stats: { byType: Record<string, number>; byGroup: Record<string, number> }
}

// Sec 2: Saleable bez dodavatelského skladu
export interface Section2 {
  total: number
  sample: { dodavatel: string; kod: string; nazev: string; skupina: string; admin: string; skladem: number; url?: string }[]
  stats: { byDodavatel: Record<string, number>; byGroup: Record<string, number> }
}

// Sec 3: WithVariant s rozdílnou cenou
export interface Section3 {
  totalRows: number
  uniqueCount: number
  sample: { id: string; nazev: string; cenik: string; skupina_id: string; skupina_nazev: string; admin: string; url?: string }[]
  stats: { byCenik: Record<string, number>; byGroup: Record<string, number> }
}

// Sec 4: Nelze doručit
export interface Section4Product {
  id: string; typ: string; nazev: string; skupina: string; admin: string; url?: string
  countries: string[]
}
export interface Section4 {
  totalRaw: number
  totalUnique: number
  products: Section4Product[]
  countryCounts: Record<string, number>
  stats: { byType: Record<string, number>; byGroup: Record<string, number> }
}

// Sec 5: Produkty s TARIC kódem — nelze odeslat
export interface Section5 {
  total: number
  items: { kod: string; typ: string; nazev: string; skupina: string; admin: string; url?: string }[]
  stats: { bySkupina: Record<string, number>; byAdmin: Record<string, number> }
}

// Sec 6: Produkty s nevyplněným TARIC kódem
export interface Section6 {
  total: number
  items: { un_kod: string; pocet: number }[]
}

// Sec 7: Dárek není skladem
export interface Section7 {
  total: number
  items: { kod: string; typ: string; nazev: string; skupina: string; admin: string; skladem: number }[]
}

// Sec 8: Nesoulad kategorizace — strom
export interface Section8Kategorie {
  nazev: string
  pocet_pravidel: number
  produktu_mimo: number
}
export interface Section8Strom {
  nazev: string
  kategorie: Section8Kategorie[]
}
export interface Section8 {
  celkem_kategorii: number
  celkem_mimo: number
  stromy: Section8Strom[]
}

// Sec 9: Objednány k likvidaci
export interface Section9 {
  celkem: number
  terminy: string[]
  items: { dodavatel: string; kod: string; nazev: string; skupina: string; admin: string; ks: number; oz_cislo: string; termin: string; level: string }[]
}

// Sec 10: Produkty v limitu autoobjednání
export interface Section10 {
  celkem: number
  terminy: string[]
  items: { dodavatel: string; kod: string; nazev: string; skupina: string; admin: string; ks: number; oz_cislo: string; termin: string; level: string }[]
}

// Sec 11: Mimo saleable
export interface Section11 {
  items: { skupina_id: string; skupina_nazev: string; admin: string; pocet: number }[]
  celkem: number
  celkem_produktu: number
  byAdmin: Record<string, number>
}

// Sec 12: Nezadané rozměry
export interface Section12 {
  celkem_produktu: number
  celkem_v_terminech: number
  pocet_terminu_oz: number
  skupiny: { nazev: string; pocet: number; admin?: string }[]
  byAdmin: Record<string, number>
}

// Sec 13: Saleable bez kategorie
export interface Section13 {
  total: number
  items: { kod: string; nazev: string; skupina: string; admin: string }[]
  stats: { bySkupina: Record<string, number>; byAdmin: Record<string, number> }
}

// Sec 14: Záporná marže
export interface Section14 {
  skupiny: { skupina: string; produkty: MarzeProduct[] }[]
}

export interface MarzeProduct {
  kod: string; nazev: string
  marze_CZ: number; marze_IT: number; marze_CH: number; marze_WEU: number
  marze_SK: number; marze_PL: number; marze_GB: number; marze_DEAT: number
  skladem: number
}

// Sec 15: Nesoulad kategorizace
export interface Section15Kategorie {
  nazev: string
  pocet_pravidel: number
  produktu_mimo: number
}
export interface Section15Strom {
  nazev: string
  kategorie: Section15Kategorie[]
}
export interface Section15 {
  celkem_kategorii: number
  celkem_mimo: number
  kategorie: Section15Kategorie[]   // flat list — for export / backward compat
  stromy: Section15Strom[]
}
