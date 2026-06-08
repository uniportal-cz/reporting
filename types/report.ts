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
  // Warehouse (Skladový) report KPI fields
  sk_sec1_count?: number   // Provizorní balíky
  sk_sec2_count?: number   // Nepodané balíky ČP
  sk_sec3_count?: number   // Fronta objednávek
  sk_sec4_count?: number   // Rozpracované převodky
  sk_sec5_count?: number   // Úkoly na šarže
  sk_sec6_count?: number   // Úkoly na kase
  sk_sec7_count?: number   // Korekce (7 dní)
  sk_sec8_count?: number   // Blokace pultů
  // Accounting (Účetní) report KPI fields
  uc_sec1_count?: number   // Nedoručené zboží (ks)
  uc_sec2_count?: number   // Přijaté faktury
  uc_sec2b_count?: number  // Faktury po splatnosti
  uc_sec3a_count?: number  // Nevykryté příjemky (počet)
  uc_sec3b_count?: number  // Nevykryto ks
  uc_sec3c_count?: number  // Nadměrně vykryté příjemky
  uc_sec4_count?: number   // Zásoby přes limit
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
  // Warehouse (Skladový) report sections
  sk_sec1?: SkSec1
  sk_sec2?: SkSec2
  sk_sec3?: SkSec3
  sk_sec4?: SkSec4
  sk_sec5?: SkSec5
  sk_sec6?: SkSec6
  sk_sec7?: SkSec7
  sk_sec8?: SkSec8
  // Accounting (Účetní) report sections
  uc_sec1?: UcSec1
  uc_sec2?: UcSec2
  uc_sec3?: UcSec3
  uc_sec4?: UcSec4
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

// ─── Warehouse (Skladový) report section types ─────────────────────────────

export interface SkSec1Balik {
  objednavka: string
  objednavka_url?: string
  dopravce: string
  stav: string
  vytvoreno?: string   // ISO datetime
  uzavreno?: string    // ISO datetime
  prodleva_min?: number
  duvod: string
  odpovida: string
}

export interface SkSec1 {
  total: number
  baliky: SkSec1Balik[]
  stats: { byDuvod: Record<string, number>; byDopravce: Record<string, number> }
}

export interface SkSec2 {
  total: number
  nejstarsi?: string  // ISO datetime
}

export interface SkSec3Item {
  sklad: string
  k_hledani: number
  k_baleni: number
  celkem: number
}

export interface SkSec3 {
  total: number
  k_hledani: number
  k_baleni: number
  sklady: SkSec3Item[]
}

export interface SkSec4Item {
  id: string
  id_url?: string
  vytvoreno?: string  // ISO datetime
  ze: string
  do: string
}

export interface SkSec4 {
  total: number
  items: SkSec4Item[]
}

export interface SkSecUkolItem {
  sklad: string
  pocet: number
  nejstarsi?: string  // ISO datetime
}

export interface SkSec5 {
  total: number
  items: SkSecUkolItem[]
}

export type SkSec6 = SkSec5

export interface SkSec7Item {
  kategorie: string
  plus: number
  minus: number
  celkem: number
}

export interface SkSec7 {
  total: number
  items: SkSec7Item[]
  odkaz?: string
}

export interface SkSec8Item {
  pult: string
  pracovnik: string
  cas_blokace: string   // ISO datetime
  produkt_nazev: string
  produkt_kod: string
  doklad: string
  odblokoval: string
  cas_odblokovani?: string   // ISO datetime, undefined = still locked
  doba_blokace_min?: number
}

export interface SkSec8 {
  total: number
  items: SkSec8Item[]
  stats: {
    byPracovnik: Record<string, number>
    byPult: Record<string, number>
    avg_doba_min?: number
  }
}

// ─── Accounting (Účetní) report section types ─────────────────────────────

export interface UcSec1Item {
  dodavatel: string
  ks_closed: number
  ks_inprocess: number
}

export interface UcSec1 {
  total_ks: number
  ks_closed: number
  ks_inprocess: number
  items: UcSec1Item[]
}

export interface UcSec2Mena {
  mena: string
  suma: number
  pocet: number
}

export interface UcSec2 {
  total: number
  po_splatnosti: number
  meny: UcSec2Mena[]
  meny_po_splatnosti: UcSec2Mena[]
  faktury_po_splatnosti: { id: string; url?: string }[]
  poznamka?: string
}

export interface UcSec3Prijemka {
  id: string
  url?: string
  datum?: string    // ISO date YYYY-MM-DD
  nevykryto: number // positive = unfulfilled, negative = over-fulfilled
  celkem?: number
  dodavatel: string // '-' if no supplier
}

export interface UcSec3 {
  nevykryte_count: number   // from header "celkem N"
  nevykryte_ks: number      // sum of all nevykryto where > 0
  nadmerne_count: number    // from header "celkem N"
  prijemky: UcSec3Prijemka[]
}

export type UcSec4 = Section10

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
