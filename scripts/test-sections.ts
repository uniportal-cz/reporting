/**
 * scripts/test-sections.ts
 *
 * Unit test suite for lib/parser.ts using realistic HTML fixtures.
 * No test framework — just plain TypeScript that prints PASS/FAIL.
 *
 * Run with:  npx tsx scripts/test-sections.ts
 */

import { parseReportEmail } from '../lib/parser'

// ---------------------------------------------------------------------------
// Mini assertion helpers
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

// ---------------------------------------------------------------------------
// HTML fixture builder helpers
// ---------------------------------------------------------------------------

function wrapEmail(body: string): string {
  return `<!DOCTYPE html><html><body>${body}</body></html>`
}

// ---------------------------------------------------------------------------
// FIXTURE: Section 1 — Zapnutý produkt v doprodeji bez zásoby
// ---------------------------------------------------------------------------

const SEC1_HTML = wrapEmail(`
<h2>1. Zapnutý produkt v doprodeji bez zásoby</h2>
<h3></h3>
<p><strong>celkem produktů: (212)</strong></p>
<ul>
  <li>1423047 (thuleBundle) - <a href="https://admin.sportega.cz/products/1423047/warehouse">Střešní nosič Thule WingBar Edge 9581</a> - 15 | travel - Lukas Drbal</li>
  <li>1356003 (saleable) - <a href="https://admin.sportega.cz/products/1356003/warehouse">Cyklistická helma Giro Aries</a> - 20 | cyklo - Jana Novak</li>
  <li>9900001 (doprodej) - <a href="https://admin.sportega.cz/products/9900001/warehouse">Boty Salomon XA Pro 3D</a> - 5 | outdoor - Petra Mlada</li>
</ul>
<h2>2. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 2 — Saleable bez dodavatelského skladu (multi-supplier)
// ---------------------------------------------------------------------------

const SEC2_HTML = wrapEmail(`
<h2>2. Produkty typu "saleable" bez informace o dodavatelském skladu</h2>
<h3>Dodavatel ABC s.r.o.</h3>
<table>
  <thead>
    <tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem u dodavatele</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Dodavatel ABC s.r.o.</td>
      <td><a href="https://admin.sportega.cz/products/123456">123456</a></td>
      <td>Produkt ABC 1</td>
      <td>cyklo</td>
      <td>JanNovak</td>
      <td>5</td>
    </tr>
    <tr>
      <td>Dodavatel ABC s.r.o.</td>
      <td><a href="https://admin.sportega.cz/products/123457">123457</a></td>
      <td>Produkt ABC 2</td>
      <td>outdoor</td>
      <td>PetraLiska</td>
      <td>0</td>
    </tr>
    <tr><td colspan="6">celkem 2 záznamy</td></tr>
  </tbody>
</table>
<h3>Dodavatel XYZ a.s.</h3>
<table>
  <thead>
    <tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem u dodavatele</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Dodavatel XYZ a.s.</td>
      <td><a href="https://admin.sportega.cz/products/789001">789001</a></td>
      <td>Produkt XYZ 1</td>
      <td>travel</td>
      <td>LukasKral</td>
      <td>12</td>
    </tr>
    <tr>
      <td>Dodavatel XYZ a.s.</td>
      <td><a href="https://admin.sportega.cz/products/789002">789002</a></td>
      <td>Produkt XYZ 2</td>
      <td>lyze</td>
      <td>MarekHavel</td>
      <td>3</td>
    </tr>
    <tr>
      <td>Dodavatel XYZ a.s.</td>
      <td><a href="https://admin.sportega.cz/products/789003">789003</a></td>
      <td>Produkt XYZ 3</td>
      <td>fitness</td>
      <td>IvaVanesa</td>
      <td>0</td>
    </tr>
    <tr><td colspan="6">celkem 3 záznamy</td></tr>
  </tbody>
</table>
<h2>3. Další sekce</h2>
`)

// Section 2 with a single table (no h3 per supplier)
const SEC2_SINGLE_TABLE_HTML = wrapEmail(`
<h2>2. Produkty typu "saleable" bez informace o dodavatelském skladu</h2>
<table>
  <thead>
    <tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem u dodavatele</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Firma ABC</td>
      <td>111001</td>
      <td>Zboží jedno</td>
      <td>outdoor</td>
      <td>AdamBily</td>
      <td>7</td>
    </tr>
    <tr>
      <td>Firma XYZ</td>
      <td>222002</td>
      <td>Zboží dvě</td>
      <td>cyklo</td>
      <td>EvaHodna</td>
      <td>0</td>
    </tr>
    <tr><td colspan="6">celkem 2 záznamy</td></tr>
  </tbody>
</table>
<h2>3. Další sekce</h2>
`)

// Section 2: heading-only variant — tests that "dodavatelském skladu" pattern fires
const SEC2_HEADING_VARIANT_HTML = wrapEmail(`
<h2>2. Produkty typu &quot;saleable&quot; bez informace o dodavatelském skladu</h2>
<table>
  <thead>
    <tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem u dodavatele</th></tr>
  </thead>
  <tbody>
    <tr><td>Supplier Z</td><td>500001</td><td>Item Z</td><td>outdoor</td><td>TestAdmin</td><td>1</td></tr>
  </tbody>
</table>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 3 — withVariant s rozdílnou cenou
// ---------------------------------------------------------------------------

const SEC3_HTML = wrapEmail(`
<h2>3. Produkty typu "withVariant" s rozdílnou cenou u varianty</h2>
<ul>
  <li>1356003 - Cyklistická helma - ceník: MOC PL - 14 | cyklo - Jana Novak</li>
  <li>2200045 - Lyžařské rukavice - ceník: MOC CZ - 8 | lyze - Michal Kral</li>
  <li>1356003 - Cyklistická helma - ceník: MOC SK - 14 | cyklo - Jana Novak</li>
</ul>
<h2>4. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 4 — PRODUKT: nelze doručit
// ---------------------------------------------------------------------------

const SEC4_HTML = wrapEmail(`
<h2>4. PRODUKT: nelze doručit</h2>
<table>
  <tbody>
    <tr><td>CZ</td><td></td><td></td><td></td><td></td></tr>
    <tr>
      <td>1000001</td>
      <td>saleable</td>
      <td>Helma Giro Syntax</td>
      <td>20 | cyklo</td>
      <td>JanNovak</td>
    </tr>
    <tr>
      <td>1000002</td>
      <td>saleable</td>
      <td>Boty Salomon</td>
      <td>5 | outdoor</td>
      <td>PetraLiska</td>
    </tr>
    <tr><td>SK</td><td></td><td></td><td></td><td></td></tr>
    <tr>
      <td>1000001</td>
      <td>saleable</td>
      <td>Helma Giro Syntax</td>
      <td>20 | cyklo</td>
      <td>JanNovak</td>
    </tr>
    <tr>
      <td>1000003</td>
      <td>saleable</td>
      <td>Kolo Trek Marlin 5</td>
      <td>20 | cyklo</td>
      <td>MartinHora</td>
    </tr>
  </tbody>
</table>
<h2>5. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 7 — Dárek: produkt není skladem
// ---------------------------------------------------------------------------

const SEC7_HTML = wrapEmail(`
<h2>7. Dárek: produkt není skladem</h2>
<table>
  <thead>
    <tr><th>Kód</th><th>Typ</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem</th></tr>
  </thead>
  <tbody>
    <tr><td>300001</td><td>gift</td><td>Dárkový balíček cyklo</td><td>dárky</td><td>EvaBlaha</td><td>0</td></tr>
    <tr><td>300002</td><td>gift</td><td>Voucher lyže</td><td>dárky</td><td>AdamBily</td><td>0</td></tr>
  </tbody>
</table>
<h2>8. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 9 — Objednány produkty k likvidaci
// ---------------------------------------------------------------------------

const SEC9_HTML = wrapEmail(`
<h2>9. Objednány produkty k likvidaci</h2>
<table>
  <thead>
    <tr>
      <th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th>
      <th>Admin</th><th>Ks</th><th>OZ</th><th>Termín</th><th>Level</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ABC Sports</td><td>400001</td><td>Boty staré</td><td>outdoor</td>
      <td>LukasKral</td><td>10</td><td>OZ-2024-001</td><td>2024-03-31</td><td>3</td>
    </tr>
    <tr>
      <td>XYZ Equipment</td><td>400002</td><td>Rukavice zimní</td><td>lyze</td>
      <td>PetraLiska</td><td>25</td><td>OZ-2024-002</td><td>2024-04-30</td><td>2</td>
    </tr>
    <tr>
      <td>ABC Sports</td><td>400003</td><td>Čepice staré</td><td>outdoor</td>
      <td>LukasKral</td><td>15</td><td>OZ-2024-003</td><td>2024-03-31</td><td>1</td>
    </tr>
  </tbody>
</table>
<h2>10. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 11 — Mimo saleable
// ---------------------------------------------------------------------------

const SEC11_HTML = wrapEmail(`
<h2>11. Počet produktů skladem mimo prodejní režim saleable</h2>
<table>
  <thead>
    <tr><th>Skupina ID</th><th>Skupina</th><th>Admin</th><th>Počet</th></tr>
  </thead>
  <tbody>
    <tr><td>20</td><td>cyklo</td><td>JanNovak</td><td>14</td></tr>
    <tr><td>8</td><td>lyze</td><td>MilanKral</td><td>7</td></tr>
    <tr><td>15</td><td>outdoor</td><td>PetraLiska</td><td>3</td></tr>
  </tbody>
</table>
<h2>12. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 12 — Připravenost příjmu | Nezadané rozměry
// ---------------------------------------------------------------------------

const SEC12_HTML = wrapEmail(`
<h2>12. Připravenost příjmu | Nezadané rozměry</h2>
<p>Počet termínů OZ: 4</p>
<table>
  <thead>
    <tr><th>Skupina</th><th>Počet</th></tr>
  </thead>
  <tbody>
    <tr><td>Lyžařská obuv</td><td>22</td></tr>
    <tr><td>Cyklistické helmy</td><td>8</td></tr>
    <tr><td>Turistické batohy</td><td>5</td></tr>
  </tbody>
</table>
<h2>13. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 13 — Saleable bez kategorie
// ---------------------------------------------------------------------------

const SEC13_HTML = wrapEmail(`
<h2>13. Produkty typu "saleable" bez kategorie</h2>
<table>
  <thead>
    <tr><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://admin.sportega.cz/products/600001">600001</a></td>
      <td>Produkt bez kategorie 1</td>
      <td>outdoor</td>
      <td>JiriPavlik</td>
    </tr>
    <tr>
      <td><a href="https://admin.sportega.cz/products/600002">600002</a></td>
      <td>Produkt bez kategorie 2</td>
      <td>cyklo</td>
      <td>LenkaBara</td>
    </tr>
  </tbody>
</table>
<h2>14. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 14 — Záporná marže (multiple tables per skupina)
// ---------------------------------------------------------------------------

const SEC14_MULTI_HTML = wrapEmail(`
<h2>14. Produkty se zápornou marží</h2>
<h3>Cyklistické kolo</h3>
<table>
  <thead>
    <tr><th>Kód</th><th>Název</th><th>CZ</th><th>IT</th><th>CH</th><th>WEU</th><th>SK</th><th>PL</th><th>GB</th><th>DEAT</th><th>Skladem</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://admin.sportega.cz/products/700001">700001</a></td>
      <td>Kolo Trek Émonda</td>
      <td>-5.2</td><td>-3.1</td><td>0</td><td>-1.5</td><td>-4.0</td><td>-6.0</td><td>-2.0</td><td>-1.0</td><td>3</td>
    </tr>
    <tr>
      <td><a href="https://admin.sportega.cz/products/700002">700002</a></td>
      <td>Kolo Specialized Diverge</td>
      <td>-8.0</td><td>0</td><td>-2.0</td><td>-3.0</td><td>-7.0</td><td>-9.0</td><td>-1.0</td><td>-4.0</td><td>1</td>
    </tr>
  </tbody>
</table>
<h3>Lyžařská obuv</h3>
<table>
  <thead>
    <tr><th>Kód</th><th>Název</th><th>CZ</th><th>IT</th><th>CH</th><th>WEU</th><th>SK</th><th>PL</th><th>GB</th><th>DEAT</th><th>Skladem</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://admin.sportega.cz/products/700010">700010</a></td>
      <td>Boty Rossignol Pure Pro</td>
      <td>-2.0</td><td>-1.0</td><td>-3.0</td><td>0</td><td>-2.5</td><td>-1.5</td><td>-4.0</td><td>-0.5</td><td>8</td>
    </tr>
  </tbody>
</table>
<h2>15. Další sekce</h2>
`)

// Section 14: single table with Skupina column
const SEC14_SINGLE_HTML = wrapEmail(`
<h2>14. Produkty se zápornou marží</h2>
<table>
  <thead>
    <tr><th>Skupina</th><th>Kód</th><th>Název</th><th>CZ</th><th>IT</th><th>CH</th><th>WEU</th><th>SK</th><th>PL</th><th>GB</th><th>DEAT</th><th>Skladem</th></tr>
  </thead>
  <tbody>
    <tr><td>cyklo</td><td>800001</td><td>Kolo Merida</td><td>-3.5</td><td>0</td><td>-1.0</td><td>-2.0</td><td>-3.0</td><td>-4.0</td><td>-1.0</td><td>-0.5</td><td>5</td></tr>
    <tr><td>outdoor</td><td>800002</td><td>Stan Deuter</td><td>-1.0</td><td>-2.0</td><td>0</td><td>-1.5</td><td>-1.0</td><td>-2.5</td><td>0</td><td>-0.3</td><td>2</td></tr>
  </tbody>
</table>
<h2>15. Další sekce</h2>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Section 15 — Nesoulad kategorizace
// ---------------------------------------------------------------------------

const SEC15_HTML = wrapEmail(`
<h2>15. Nesoulad kategorizace dle pravidel</h2>
<table>
  <thead>
    <tr><th>Kategorie</th><th>Pravidel</th><th>Produktů mimo</th></tr>
  </thead>
  <tbody>
    <tr><td>Cyklistické helmy</td><td>5</td><td>12</td></tr>
    <tr><td>Lyžařské boty</td><td>3</td><td>7</td></tr>
    <tr><td>Turistické batohy</td><td>8</td><td>2</td></tr>
  </tbody>
</table>
`)

// ---------------------------------------------------------------------------
// FIXTURE: Full email with all sections (for integration smoke test)
// ---------------------------------------------------------------------------

const FULL_EMAIL_HTML = wrapEmail(`
<h2>1. Zapnutý produkt v doprodeji bez zásoby</h2>
<p><strong>celkem produktů: (3)</strong></p>
<ul>
  <li>1423047 (thuleBundle) - <a href="https://admin.sportega.cz/products/1423047/warehouse">Střešní nosič Thule</a> - 15 | travel - Lukas Drbal</li>
  <li>1356003 (saleable) - <a href="https://admin.sportega.cz/products/1356003/warehouse">Cyklistická helma</a> - 20 | cyklo - Jana Novak</li>
</ul>

<h2>2. Produkty typu "saleable" bez informace o dodavatelském skladu</h2>
<table>
  <thead>
    <tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem u dodavatele</th></tr>
  </thead>
  <tbody>
    <tr><td>ABC Firma</td><td>111001</td><td>Produkt Full 1</td><td>outdoor</td><td>JanKlic</td><td>0</td></tr>
    <tr><td colspan="6">celkem 1 záznam</td></tr>
  </tbody>
</table>

<h2>3. Produkty typu "withVariant" s rozdílnou cenou u varianty</h2>
<ul>
  <li>1356003 - Cyklistická helma - ceník: MOC PL - 14 | cyklo - Jana Novak</li>
</ul>

<h2>4. PRODUKT: nelze doručit</h2>
<table>
  <tbody>
    <tr><td>CZ</td><td></td><td></td><td></td><td></td></tr>
    <tr><td>1000001</td><td>saleable</td><td>Helma Full</td><td>20 | cyklo</td><td>JanNovak</td></tr>
  </tbody>
</table>

<h2>7. Dárek: produkt není skladem</h2>
<table>
  <thead>
    <tr><th>Kód</th><th>Typ</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem</th></tr>
  </thead>
  <tbody>
    <tr><td>300001</td><td>gift</td><td>Dárek Full</td><td>dárky</td><td>EvaBlaha</td><td>0</td></tr>
  </tbody>
</table>

<h2>9. Objednány produkty k likvidaci</h2>
<table>
  <thead>
    <tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Ks</th><th>OZ</th><th>Termín</th><th>Level</th></tr>
  </thead>
  <tbody>
    <tr><td>ABC Sports</td><td>400001</td><td>Boty staré</td><td>outdoor</td><td>LukasKral</td><td>10</td><td>OZ-001</td><td>2024-03-31</td><td>3</td></tr>
  </tbody>
</table>

<h2>11. Počet produktů skladem mimo prodejní režim saleable</h2>
<table>
  <thead>
    <tr><th>Skupina ID</th><th>Skupina</th><th>Admin</th><th>Počet</th></tr>
  </thead>
  <tbody>
    <tr><td>20</td><td>cyklo</td><td>JanNovak</td><td>14</td></tr>
  </tbody>
</table>

<h2>12. Připravenost příjmu | Nezadané rozměry</h2>
<table>
  <thead>
    <tr><th>Skupina</th><th>Počet</th></tr>
  </thead>
  <tbody>
    <tr><td>Cyklistické helmy</td><td>8</td></tr>
  </tbody>
</table>

<h2>13. Produkty typu "saleable" bez kategorie</h2>
<table>
  <thead>
    <tr><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th></tr>
  </thead>
  <tbody>
    <tr><td>600001</td><td>Produkt bez kategorie</td><td>outdoor</td><td>JiriPavlik</td></tr>
  </tbody>
</table>

<h2>14. Produkty se zápornou marží</h2>
<h3>Cyklo</h3>
<table>
  <thead>
    <tr><th>Kód</th><th>Název</th><th>CZ</th><th>IT</th><th>CH</th><th>WEU</th><th>SK</th><th>PL</th><th>GB</th><th>DEAT</th><th>Skladem</th></tr>
  </thead>
  <tbody>
    <tr><td>700001</td><td>Kolo Trek</td><td>-5.2</td><td>-3.1</td><td>0</td><td>-1.5</td><td>-4.0</td><td>-6.0</td><td>-2.0</td><td>-1.0</td><td>3</td></tr>
  </tbody>
</table>

<h2>15. Nesoulad kategorizace dle pravidel</h2>
<table>
  <thead>
    <tr><th>Kategorie</th><th>Pravidel</th><th>Produktů mimo</th></tr>
  </thead>
  <tbody>
    <tr><td>Cyklistické helmy</td><td>5</td><td>12</td></tr>
  </tbody>
</table>
`)

// ---------------------------------------------------------------------------
// Helpers for parsing and extracting sections
// ---------------------------------------------------------------------------

function parse(html: string) {
  return parseReportEmail(html, '2026-06-05', new Date().toISOString(), 'obchodni')
}

// ---------------------------------------------------------------------------
// TEST: Section 1
// ---------------------------------------------------------------------------

function testSection1() {
  section('SECTION 1 — Zapnutý produkt v doprodeji bez zásoby')
  const r = parse(SEC1_HTML)
  const s = r.sections.sec1

  assert(s !== undefined, 'sec1 is defined (heading found)')
  if (!s) return

  assert(s.total === 212, `total from "celkem produktů: (212)" = ${s.total}`)
  assert(s.sample.length === 3, `sample has 3 items, got ${s.sample.length}`)

  const first = s.sample[0]
  assert(first?.id === '1423047', `first item id = "1423047", got "${first?.id}"`)
  assert(first?.typ === 'thuleBundle', `first item typ = "thuleBundle", got "${first?.typ}"`)
  assert(first?.admin === 'Lukas Drbal', `first item admin = "Lukas Drbal", got "${first?.admin}"`)
  assert(first?.skupina_id === '15', `first item skupina_id = "15", got "${first?.skupina_id}"`)
  assert(first?.skupina_nazev === 'travel', `first item skupina_nazev = "travel", got "${first?.skupina_nazev}"`)
  assert(!!first?.url, `first item has url, got "${first?.url}"`)

  const third = s.sample[2]
  assert(third?.id === '9900001', `third item id = "9900001", got "${third?.id}"`)
  assert(third?.typ === 'doprodej', `third item typ = "doprodej", got "${third?.typ}"`)

  assert(typeof s.stats.byType === 'object', 'stats.byType is object')
  assert(typeof s.stats.byGroup === 'object', 'stats.byGroup is object')
  assert(s.stats.byType['thuleBundle'] === 1, `byType["thuleBundle"] = 1, got ${s.stats.byType['thuleBundle']}`)
}

// ---------------------------------------------------------------------------
// TEST: Section 2
// ---------------------------------------------------------------------------

function testSection2() {
  section('SECTION 2 — Saleable bez dodavatelského skladu (multi-table)')
  const r = parse(SEC2_HTML)
  const s = r.sections.sec2

  assert(s !== undefined, 'sec2 is defined (heading found with multi-table HTML)')
  if (!s) {
    console.error('    [DEBUG] sec2 is undefined — heading not matched. Check pattern.')
    return
  }

  assert(s.sample.length === 5, `sample has 5 items (2 from ABC + 3 from XYZ), got ${s.sample.length}`)

  // Check that "celkem N záznamy" rows are filtered out
  const celkemRows = s.sample.filter(i => /celkem/i.test(i.kod) || /celkem/i.test(i.dodavatel))
  assert(celkemRows.length === 0, `no "celkem" rows in sample, found ${celkemRows.length}`)

  // Check that header rows are filtered out
  const headerRows = s.sample.filter(i => /^kód?$/i.test(i.kod))
  assert(headerRows.length === 0, `no header rows in sample, found ${headerRows.length}`)

  // Check actual data
  assert(s.sample[0]?.dodavatel === 'Dodavatel ABC s.r.o.', `first item dodavatel = "Dodavatel ABC s.r.o.", got "${s.sample[0]?.dodavatel}"`)
  assert(s.sample[0]?.kod === '123456', `first item kod = "123456", got "${s.sample[0]?.kod}"`)
  assert(s.sample[0]?.nazev === 'Produkt ABC 1', `first item nazev, got "${s.sample[0]?.nazev}"`)
  assert(s.sample[0]?.skladem === 5, `first item skladem = 5, got ${s.sample[0]?.skladem}`)

  // Admin normalisation: "JanNovak" → "Jan Novak"
  assert(s.sample[0]?.admin === 'Jan Novak', `admin normalised "JanNovak" → "Jan Novak", got "${s.sample[0]?.admin}"`)

  assert(typeof s.stats.byDodavatel === 'object', 'stats.byDodavatel is object')
  assert(s.stats.byDodavatel['Dodavatel ABC s.r.o.'] === 2, `byDodavatel["Dodavatel ABC s.r.o."] = 2, got ${s.stats.byDodavatel['Dodavatel ABC s.r.o.']}`)
  assert(s.stats.byDodavatel['Dodavatel XYZ a.s.'] === 3, `byDodavatel["Dodavatel XYZ a.s."] = 3, got ${s.stats.byDodavatel['Dodavatel XYZ a.s.']}`)

  assert(s.total === 5, `total = 5 (same as sample length for sec2), got ${s.total}`)
}

function testSection2SingleTable() {
  section('SECTION 2 — Single table variant')
  const r = parse(SEC2_SINGLE_TABLE_HTML)
  const s = r.sections.sec2

  assert(s !== undefined, 'sec2 is defined (single table)')
  if (!s) return

  assert(s.sample.length === 2, `sample has 2 items (celkem row filtered), got ${s.sample.length}`)
  assert(s.sample[0]?.kod === '111001', `first item kod = "111001", got "${s.sample[0]?.kod}"`)
  assert(s.sample[1]?.kod === '222002', `second item kod = "222002", got "${s.sample[1]?.kod}"`)
}

function testSection2HeadingVariant() {
  section('SECTION 2 — HTML-entity heading ("dodavatelském skladu" pattern)')
  const r = parse(SEC2_HEADING_VARIANT_HTML)
  const s = r.sections.sec2

  assert(s !== undefined, 'sec2 found with HTML-entity heading containing "dodavatelském skladu"')
  if (!s) return

  assert(s.sample.length === 1, `1 item found, got ${s.sample.length}`)
  assert(s.sample[0]?.kod === '500001', `item kod = "500001", got "${s.sample[0]?.kod}"`)
}

// ---------------------------------------------------------------------------
// TEST: Section 3
// ---------------------------------------------------------------------------

function testSection3() {
  section('SECTION 3 — WithVariant s rozdílnou cenou')
  const r = parse(SEC3_HTML)
  const s = r.sections.sec3

  assert(s !== undefined, 'sec3 is defined')
  if (!s) return

  // 3 bullet lines but 2 unique IDs (1356003 appears twice)
  assert(s.totalRows === 3, `totalRows = 3 (incl. duplicates), got ${s.totalRows}`)
  assert(s.uniqueCount === 2, `uniqueCount = 2 (dedup by id), got ${s.uniqueCount}`)
  assert(s.sample.length === 2, `sample.length = 2, got ${s.sample.length}`)

  const first = s.sample[0]
  assert(first?.id === '1356003', `first id = "1356003", got "${first?.id}"`)
  assert(first?.cenik === 'MOC PL', `first cenik = "MOC PL", got "${first?.cenik}"`)
  assert(first?.admin === 'Jana Novak', `first admin = "Jana Novak", got "${first?.admin}"`)
  assert(first?.skupina_id === '14', `first skupina_id = "14", got "${first?.skupina_id}"`)
  assert(first?.skupina_nazev === 'cyklo', `first skupina_nazev = "cyklo", got "${first?.skupina_nazev}"`)

  assert(typeof s.stats.byCenik === 'object', 'stats.byCenik is object')
  assert(s.stats.byCenik['MOC PL'] === 1, `byCenik["MOC PL"] = 1, got ${s.stats.byCenik['MOC PL']}`)
}

// ---------------------------------------------------------------------------
// TEST: Section 4
// ---------------------------------------------------------------------------

function testSection4() {
  section('SECTION 4 — PRODUKT: nelze doručit')
  const r = parse(SEC4_HTML)
  const s = r.sections.sec4

  assert(s !== undefined, 'sec4 is defined')
  if (!s) return

  // Product 1000001 appears in CZ and SK → unique=2, raw=4 (2 CZ + 1 SK twice)
  // Actually: CZ has 1000001 + 1000002, SK has 1000001 + 1000003 → totalRaw=4, totalUnique=3
  assert(s.totalRaw === 4, `totalRaw = 4, got ${s.totalRaw}`)
  assert(s.totalUnique === 3, `totalUnique = 3 (3 unique product IDs), got ${s.totalUnique}`)

  const p1 = s.products.find(p => p.id === '1000001')
  assert(!!p1, 'product 1000001 exists')
  assert(p1?.countries.includes('CZ') ?? false, 'product 1000001 in CZ')
  assert(p1?.countries.includes('SK') ?? false, 'product 1000001 in SK')
  assert(p1?.countries.length === 2, `product 1000001 has 2 countries, got ${p1?.countries.length}`)

  const p2 = s.products.find(p => p.id === '1000002')
  assert(!!p2, 'product 1000002 exists')
  assert(p2?.countries[0] === 'CZ', `product 1000002 country = CZ, got ${p2?.countries[0]}`)

  assert(s.countryCounts['CZ'] === 2, `CZ count = 2, got ${s.countryCounts['CZ']}`)
  assert(s.countryCounts['SK'] === 2, `SK count = 2, got ${s.countryCounts['SK']}`)

  assert(typeof s.stats.byType === 'object', 'stats.byType is object')
}

// ---------------------------------------------------------------------------
// TEST: Section 7
// ---------------------------------------------------------------------------

function testSection7() {
  section('SECTION 7 — Dárek: produkt není skladem')
  const r = parse(SEC7_HTML)
  const s = r.sections.sec7

  assert(s !== undefined, 'sec7 is defined')
  if (!s) return

  assert(s.items.length === 2, `items.length = 2, got ${s.items.length}`)
  assert(s.items[0]?.kod === '300001', `first item kod = "300001", got "${s.items[0]?.kod}"`)
  assert(s.items[0]?.typ === 'gift', `first item typ = "gift", got "${s.items[0]?.typ}"`)
  assert(s.items[0]?.skladem === 0, `first item skladem = 0, got ${s.items[0]?.skladem}`)
  assert(s.items[1]?.kod === '300002', `second item kod = "300002", got "${s.items[1]?.kod}"`)
}

// ---------------------------------------------------------------------------
// TEST: Section 9
// ---------------------------------------------------------------------------

function testSection9() {
  section('SECTION 9 — Objednány produkty k likvidaci')
  const r = parse(SEC9_HTML)
  const s = r.sections.sec9

  assert(s !== undefined, 'sec9 is defined')
  if (!s) return

  assert(s.items.length === 3, `items.length = 3, got ${s.items.length}`)
  assert(s.celkem === 50, `celkem = 50 (10+25+15), got ${s.celkem}`)
  assert(s.terminy.length === 2, `terminy.length = 2 (distinct dates), got ${s.terminy.length}`)
  assert(s.terminy.includes('2024-03-31'), `terminy includes "2024-03-31"`)
  assert(s.terminy.includes('2024-04-30'), `terminy includes "2024-04-30"`)

  const first = s.items[0]
  assert(first?.dodavatel === 'ABC Sports', `first dodavatel = "ABC Sports", got "${first?.dodavatel}"`)
  assert(first?.kod === '400001', `first kod = "400001", got "${first?.kod}"`)
  assert(first?.ks === 10, `first ks = 10, got ${first?.ks}`)
  assert(first?.oz_cislo === 'OZ-2024-001', `first OZ = "OZ-2024-001", got "${first?.oz_cislo}"`)
  assert(first?.termin === '2024-03-31', `first termin = "2024-03-31", got "${first?.termin}"`)
  assert(first?.level === '3', `first level = "3", got "${first?.level}"`)
}

// ---------------------------------------------------------------------------
// TEST: Section 11
// ---------------------------------------------------------------------------

function testSection11() {
  section('SECTION 11 — Mimo saleable')
  const r = parse(SEC11_HTML)
  const s = r.sections.sec11

  assert(s !== undefined, 'sec11 is defined')
  if (!s) return

  assert(s.items.length === 3, `items.length = 3, got ${s.items.length}`)
  assert(s.celkem === 24, `celkem = 24 (14+7+3), got ${s.celkem}`)

  assert(s.items[0]?.skupina_id === '20', `first skupina_id = "20", got "${s.items[0]?.skupina_id}"`)
  assert(s.items[0]?.skupina_nazev === 'cyklo', `first skupina_nazev = "cyklo", got "${s.items[0]?.skupina_nazev}"`)
  assert(s.items[0]?.pocet === 14, `first pocet = 14, got ${s.items[0]?.pocet}`)
}

// ---------------------------------------------------------------------------
// TEST: Section 12
// ---------------------------------------------------------------------------

function testSection12() {
  section('SECTION 12 — Připravenost příjmu | Nezadané rozměry')
  const r = parse(SEC12_HTML)
  const s = r.sections.sec12

  assert(s !== undefined, 'sec12 is defined')
  if (!s) return

  assert(s.skupiny.length === 3, `skupiny.length = 3, got ${s.skupiny.length}`)
  assert(s.celkem_produktu === 35, `celkem_produktu = 35 (22+8+5), got ${s.celkem_produktu}`)
  // pocet_terminu_oz from summary text
  assert(s.pocet_terminu_oz === 4, `pocet_terminu_oz = 4 (from "Počet termínů OZ: 4"), got ${s.pocet_terminu_oz}`)

  assert(s.skupiny[0]?.nazev === 'Lyžařská obuv', `first skupina nazev = "Lyžařská obuv", got "${s.skupiny[0]?.nazev}"`)
  assert(s.skupiny[0]?.pocet === 22, `first skupina pocet = 22, got ${s.skupiny[0]?.pocet}`)
}

// ---------------------------------------------------------------------------
// TEST: Section 13
// ---------------------------------------------------------------------------

function testSection13() {
  section('SECTION 13 — Saleable bez kategorie')
  const r = parse(SEC13_HTML)
  const s = r.sections.sec13

  assert(s !== undefined, 'sec13 is defined')
  if (!s) return

  assert(s.items.length === 2, `items.length = 2, got ${s.items.length}`)
  assert(s.items[0]?.kod === '600001', `first item kod = "600001", got "${s.items[0]?.kod}"`)
  assert(s.items[0]?.nazev === 'Produkt bez kategorie 1', `first item nazev, got "${s.items[0]?.nazev}"`)
  assert(s.items[0]?.skupina === 'outdoor', `first item skupina = "outdoor", got "${s.items[0]?.skupina}"`)
  assert(s.items[0]?.admin === 'JiriPavlik', `first item admin = "JiriPavlik", got "${s.items[0]?.admin}"`)
}

// ---------------------------------------------------------------------------
// TEST: Section 14 (multiple tables)
// ---------------------------------------------------------------------------

function testSection14Multi() {
  section('SECTION 14 — Záporná marže (multi-table per skupina)')
  const r = parse(SEC14_MULTI_HTML)
  const s = r.sections.sec14

  assert(s !== undefined, 'sec14 is defined')
  if (!s) return

  assert(s.skupiny.length === 2, `skupiny.length = 2, got ${s.skupiny.length}`)

  const sk0 = s.skupiny[0]
  assert(sk0?.produkty.length === 2, `first skupina has 2 produkty, got ${sk0?.produkty.length}`)
  assert(sk0?.produkty[0]?.kod === '700001', `first produkt kod = "700001", got "${sk0?.produkty[0]?.kod}"`)
  assert(sk0?.produkty[0]?.marze_CZ === -5.2, `first produkt marze_CZ = -5.2, got ${sk0?.produkty[0]?.marze_CZ}`)
  assert(sk0?.produkty[0]?.skladem === 3, `first produkt skladem = 3, got ${sk0?.produkty[0]?.skladem}`)

  const sk1 = s.skupiny[1]
  assert(sk1?.produkty.length === 1, `second skupina has 1 produkt, got ${sk1?.produkty.length}`)
  assert(sk1?.produkty[0]?.kod === '700010', `second skupina produkt kod = "700010", got "${sk1?.produkty[0]?.kod}"`)
}

function testSection14Single() {
  section('SECTION 14 — Záporná marže (single table with Skupina column)')
  const r = parse(SEC14_SINGLE_HTML)
  const s = r.sections.sec14

  assert(s !== undefined, 'sec14 is defined (single table)')
  if (!s) return

  // Single table: grouped by Skupina column value
  assert(s.skupiny.length >= 1, `at least 1 skupina, got ${s.skupiny.length}`)
  const allProducts = s.skupiny.flatMap(g => g.produkty)
  assert(allProducts.length === 2, `total 2 products across skupiny, got ${allProducts.length}`)

  const cykloGroup = s.skupiny.find(g => g.skupina === 'cyklo')
  assert(!!cykloGroup, `skupina "cyklo" exists`)
  assert(cykloGroup?.produkty[0]?.kod === '800001', `cyklo produkt kod = "800001", got "${cykloGroup?.produkty[0]?.kod}"`)
  assert(cykloGroup?.produkty[0]?.marze_CZ === -3.5, `cyklo produkt marze_CZ = -3.5, got ${cykloGroup?.produkty[0]?.marze_CZ}`)
}

// ---------------------------------------------------------------------------
// TEST: Section 15
// ---------------------------------------------------------------------------

function testSection15() {
  section('SECTION 15 — Nesoulad kategorizace')
  const r = parse(SEC15_HTML)
  const s = r.sections.sec15

  assert(s !== undefined, 'sec15 is defined')
  if (!s) return

  assert(s.kategorie.length === 3, `kategorie.length = 3, got ${s.kategorie.length}`)
  assert(s.kategorie[0]?.nazev === 'Cyklistické helmy', `first nazev = "Cyklistické helmy", got "${s.kategorie[0]?.nazev}"`)
  assert(s.kategorie[0]?.pocet_pravidel === 5, `first pocet_pravidel = 5, got ${s.kategorie[0]?.pocet_pravidel}`)
  assert(s.kategorie[0]?.produktu_mimo === 12, `first produktu_mimo = 12, got ${s.kategorie[0]?.produktu_mimo}`)
  assert(s.kategorie[2]?.nazev === 'Turistické batohy', `third nazev = "Turistické batohy", got "${s.kategorie[2]?.nazev}"`)
  assert(s.kategorie[2]?.pocet_pravidel === 8, `third pocet_pravidel = 8, got ${s.kategorie[2]?.pocet_pravidel}`)
  assert(s.kategorie[2]?.produktu_mimo === 2, `third produktu_mimo = 2, got ${s.kategorie[2]?.produktu_mimo}`)
}

// ---------------------------------------------------------------------------
// TEST: Integration — full email all sections parsed
// ---------------------------------------------------------------------------

function testFullEmail() {
  section('INTEGRATION — Full email (all sections present)')
  const r = parse(FULL_EMAIL_HTML)
  const s = r.sections

  assert(s.sec1 !== undefined, 'sec1 found in full email')
  assert(s.sec2 !== undefined, 'sec2 found in full email')
  assert(s.sec3 !== undefined, 'sec3 found in full email')
  assert(s.sec4 !== undefined, 'sec4 found in full email')
  assert(s.sec7 !== undefined, 'sec7 found in full email')
  assert(s.sec9 !== undefined, 'sec9 found in full email')
  assert(s.sec11 !== undefined, 'sec11 found in full email')
  assert(s.sec12 !== undefined, 'sec12 found in full email')
  assert(s.sec13 !== undefined, 'sec13 found in full email')
  assert(s.sec14 !== undefined, 'sec14 found in full email')
  assert(s.sec15 !== undefined, 'sec15 found in full email')

  // KPI sanity checks
  assert(r.kpi.sec1_count >= 2, `KPI sec1_count >= 2, got ${r.kpi.sec1_count}`)
  assert(r.kpi.sec4_count >= 1, `KPI sec4_count >= 1, got ${r.kpi.sec4_count}`)
  assert(r.kpi.sec13_count >= 1, `KPI sec13_count >= 1, got ${r.kpi.sec13_count}`)
  assert(r.kpi.sec14_count >= 1, `KPI sec14_count >= 1, got ${r.kpi.sec14_count}`)
  assert(r.kpi.sec9_terms >= 1, `KPI sec9_terms >= 1, got ${r.kpi.sec9_terms}`)
}

// ---------------------------------------------------------------------------
// TEST: Edge cases
// ---------------------------------------------------------------------------

function testEdgeCases() {
  section('EDGE CASES')

  // Empty email — all sections undefined, no crash
  const r1 = parse(wrapEmail(''))
  assert(r1.sections.sec1 === undefined, 'empty html: sec1 undefined')
  assert(r1.sections.sec2 === undefined, 'empty html: sec2 undefined')
  assert(r1.kpi.sec1_count === 0, 'empty html: KPI sec1_count = 0')

  // Section with heading but empty table
  const r2 = parse(wrapEmail(`
    <h2>2. Produkty typu "saleable" bez informace o dodavatelském skladu</h2>
    <table><thead><tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem u dodavatele</th></tr></thead><tbody></tbody></table>
  `))
  assert(r2.sections.sec2 !== undefined, 'sec2 defined for empty table')
  assert(r2.sections.sec2?.sample.length === 0, `sec2 empty table: sample.length = 0, got ${r2.sections.sec2?.sample.length}`)

  // Section 1 with table fallback (no bullet list)
  const r3 = parse(wrapEmail(`
    <h2>1. Zapnutý produkt v doprodeji bez zásoby</h2>
    <p><strong>celkem produktů: (5)</strong></p>
    <table>
      <thead><tr><th>ID</th><th>Typ</th><th>Název</th><th>Skupina ID</th><th>Skupina</th><th>Admin</th></tr></thead>
      <tbody>
        <tr><td><a href="http://example.com/1">111111</a></td><td>saleable</td><td>Produkt tabulka</td><td>10</td><td>outdoor</td><td>Tester One</td></tr>
      </tbody>
    </table>
  `))
  assert(r3.sections.sec1 !== undefined, 'sec1 table fallback: section defined')
  assert(r3.sections.sec1?.total === 5, `sec1 table fallback: total = 5, got ${r3.sections.sec1?.total}`)
  assert(r3.sections.sec1?.sample.length === 1, `sec1 table fallback: 1 item, got ${r3.sections.sec1?.sample.length}`)
  assert(r3.sections.sec1?.sample[0]?.id === '111111', `sec1 table fallback: id = "111111", got "${r3.sections.sec1?.sample[0]?.id}"`)

  // Section 9: heading text with "objednány k likvidaci" variant
  const r4 = parse(wrapEmail(`
    <h2>9. Objednány produkty k likvidaci</h2>
    <table>
      <thead><tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Ks</th><th>OZ</th><th>Termín</th><th>Level</th></tr></thead>
      <tbody>
        <tr><td>Test Co</td><td>999</td><td>Tester</td><td>test</td><td>Admin</td><td>3</td><td>OZ-999</td><td>2025-01-01</td><td>1</td></tr>
      </tbody>
    </table>
  `))
  assert(r4.sections.sec9 !== undefined, 'sec9 found with standard heading')
  assert(r4.sections.sec9?.celkem === 3, `sec9 celkem = 3, got ${r4.sections.sec9?.celkem}`)

  // parseNum: handles commas
  const r5 = parse(wrapEmail(`
    <h2>14. Produkty se zápornou marží</h2>
    <h3>test</h3>
    <table>
      <thead><tr><th>Kód</th><th>Název</th><th>CZ</th><th>IT</th><th>CH</th><th>WEU</th><th>SK</th><th>PL</th><th>GB</th><th>DEAT</th><th>Skladem</th></tr></thead>
      <tbody>
        <tr><td>X001</td><td>Item</td><td>-3,5</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>10</td></tr>
      </tbody>
    </table>
  `))
  assert(r5.sections.sec14 !== undefined, 'sec14 with comma decimals: defined')
  const marzeCZ = r5.sections.sec14?.skupiny[0]?.produkty[0]?.marze_CZ
  assert(marzeCZ === -3.5, `parseNum("-3,5") → -3.5, got ${marzeCZ}`)
}

// ---------------------------------------------------------------------------
// TEST: Section 2 — specific diagnostic tests
// ---------------------------------------------------------------------------

function testSection2Diagnostics() {
  section('SECTION 2 — Diagnostics (heading pattern matching)')

  // Test every known heading variant that should match
  const matchingVariants = [
    // Standard heading with smart (curly) quotes — the actual email format
    `<h2>2. Produkty typu “saleable” bez informace o dodavatelském skladu</h2>`,
    // With straight ASCII quotes
    `<h2>2. Produkty typu "saleable" bez informace o dodavatelském skladu</h2>`,
    // Regex pattern: "2. saleable"
    `<h2>2. saleable produkty bez dodavatele</h2>`,
    // Regex pattern: "2. dodavatel"
    `<h2>2. dodavatel info chybí</h2>`,
    // String pattern: "bez dodavatelského skladu"
    `<h2>2. Produkty bez dodavatelského skladu</h2>`,
    // String pattern: "dodavatelském skladu"
    `<h2>2. Informace o dodavatelském skladu chybí</h2>`,
  ]

  const tableHtml = `
    <table>
      <thead><tr><th>Dodavatel</th><th>Kód</th><th>Název</th><th>Skupina</th><th>Admin</th><th>Skladem u dodavatele</th></tr></thead>
      <tbody><tr><td>Test Firm</td><td>123</td><td>Product</td><td>test</td><td>Admin</td><td>5</td></tr></tbody>
    </table>
    <h2>3. Next section</h2>
  `

  for (const headingHtml of matchingVariants) {
    const r = parse(wrapEmail(headingHtml + tableHtml))
    const label = headingHtml.replace(/<[^>]+>/g, '').trim().substring(0, 60)
    assert(r.sections.sec2 !== undefined, `heading found: "${label}"`)
  }

  // This variant (ASCII-stripped diacritics) is NOT expected to match —
  // real emails always use proper UTF-8 Czech characters.
  const noMatchVariant = `<h2>2. Produkty typu "saleable" bez informace o dodavatelskem skladu</h2>`
  const rNoMatch = parse(wrapEmail(noMatchVariant + tableHtml))
  assert(
    rNoMatch.sections.sec2 === undefined,
    'ASCII-stripped heading "dodavatelskem skladu" correctly NOT matched (diacritics required)'
  )
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

console.log('\n' + '═'.repeat(60))
console.log('  PARSER TEST SUITE')
console.log('═'.repeat(60))

testSection1()
testSection2()
testSection2SingleTable()
testSection2HeadingVariant()
testSection2Diagnostics()
testSection3()
testSection4()
testSection7()
testSection9()
testSection11()
testSection12()
testSection13()
testSection14Multi()
testSection14Single()
testSection15()
testFullEmail()
testEdgeCases()

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '═'.repeat(60))
const total = passed + failed
if (failed === 0) {
  console.log(`  ALL ${total} TESTS PASSED`)
} else {
  console.log(`  RESULTS: ${passed} passed, ${failed} FAILED (out of ${total})`)
}
console.log('═'.repeat(60) + '\n')

process.exit(failed > 0 ? 1 : 0)
