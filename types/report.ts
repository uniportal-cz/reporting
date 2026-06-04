export interface ReportIndex {
  reports: { date: string; kpi: ReportKPI }[]
}

export interface ReportKPI {
  sec1_count: number       // Zapnutý v doprodeji bez zásoby
  sec4_count: number       // Nelze doručit (unikátní produkty × země)
  sec14_count: number      // Záporná marže
  sec13_count: number      // Saleable bez kategorie
  sec9_terms: number       // Termínů likvidace
}

export interface Report {
  date: string             // YYYY-MM-DD
  fetchedAt: string        // ISO timestamp
  kpi: ReportKPI
  sections: ReportSections
}

export interface ReportSections {
  sec1?: Section1
  sec2?: Section2
  sec3?: Section3
  sec4?: Section4
  sec7?: Section7
  sec9?: Section9
  sec11?: Section11
  sec12?: Section12
  sec13?: Section13
  sec14?: Section14
  sec15?: Section15
}

// Sec 1: Zapnutý v doprodeji bez zásoby
export interface Section1 {
  count: number
  items: { id: string; typ: string; nazev: string; skupina_id: string; skupina_nazev: string; odpovedna_osoba: string }[]
}

// Sec 2: Saleable bez dodavatelského skladu
export interface Section2 {
  dodavatele: { dodavatel: string; produkty: { kod: string; nazev: string; skupina: string; admin: string; skladem: number }[] }[]
}

// Sec 3: WithVariant s rozdílnou cenou
export interface Section3 {
  items: { id: string; nazev: string; cenik: string; skupina: string; admin: string }[]
}

// Sec 4: Nelze doručit
export interface Section4 {
  zeme: { zeme: string; produkty: { id: string; typ: string; nazev: string; skupina: string; admin: string }[] }[]
}

// Sec 7: Dárek není skladem
export interface Section7 {
  items: { kod: string; typ: string; nazev: string; skupina: string; admin: string; skladem: number }[]
}

// Sec 9: Objednány k likvidaci
export interface Section9 {
  celkem: number
  terminy: string[]
  items: { dodavatel: string; kod: string; nazev: string; skupina: string; admin: string; ks: number; oz_cislo: string; termin: string; level: string }[]
}

// Sec 11: Mimo saleable
export interface Section11 {
  items: { skupina_id: string; skupina_nazev: string; admin: string; pocet: number }[]
  celkem: number
}

// Sec 12: Nezadané rozměry
export interface Section12 {
  celkem_produktu: number
  pocet_terminu_oz: number
  skupiny: { nazev: string; pocet: number }[]
}

// Sec 13: Saleable bez kategorie
export interface Section13 {
  items: { kod: string; nazev: string; skupina: string; admin: string }[]
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
export interface Section15 {
  kategorie: { nazev: string; pocet_pravidel: number; produktu_mimo: number }[]
}
