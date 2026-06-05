// scripts/test-parser.ts
// Stáhne první "Obchodní report" email a spustí parser
// Vypíše: pro každou sekci zda byla nalezena a kolik položek
// Pomůže identifikovat co parser nenachází
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { fetchLatestReportEmail } from '../lib/imap'
import { parseReportEmail } from '../lib/parser'

async function main() {
  console.log('=== Parser Test ===')
  console.log('Fetching latest "Obchodní report" email...\n')

  const fetched = await fetchLatestReportEmail(
    'Obchodn',
    (subject: string) => {
      const s = subject.toLowerCase()
      return s.includes('obchodní report') || s.includes('obchodni report')
    }
  )

  if (!fetched) {
    console.error('No matching email found. Run test:imap first to check subject patterns.')
    process.exit(1)
  }

  console.log(`Subject: ${fetched.subject}`)
  console.log(`Date:    ${fetched.date.toISOString()}`)
  console.log(`HTML length: ${fetched.html.length} chars\n`)

  const date = fetched.date.toISOString().slice(0, 10)
  const report = parseReportEmail(fetched.html, date, new Date().toISOString(), 'obchodni')

  console.log('=== Parsed sections ===\n')

  const s = report.sections

  function status(found: boolean, count?: number): string {
    if (!found) return 'NOT FOUND'
    return count !== undefined ? `FOUND (${count} items)` : 'FOUND'
  }

  console.log(`sec1  (Doprodej bez zásoby):      ${status(!!s.sec1, s.sec1?.sample.length)}`)
  console.log(`sec2  (Saleable bez dodavatele):   ${status(!!s.sec2, s.sec2?.sample.length)}`)
  console.log(`sec3  (WithVariant rozdílná cena): ${status(!!s.sec3, s.sec3?.uniqueCount)}`)
  console.log(`sec4  (Nelze doručit):             ${status(!!s.sec4, s.sec4?.zeme.reduce((n, z) => n + z.produkty.length, 0))}`)
  console.log(`sec7  (Dárek není skladem):        ${status(!!s.sec7, s.sec7?.items.length)}`)
  console.log(`sec9  (Objednány k likvidaci):     ${status(!!s.sec9, s.sec9?.items.length)}`)
  console.log(`sec11 (Mimo saleable):             ${status(!!s.sec11, s.sec11?.items.length)}`)
  console.log(`sec12 (Nezadané rozměry):          ${status(!!s.sec12, s.sec12?.skupiny.length)}`)
  console.log(`sec13 (Saleable bez kategorie):    ${status(!!s.sec13, s.sec13?.items.length)}`)
  console.log(`sec14 (Záporná marže):             ${status(!!s.sec14, s.sec14?.skupiny.reduce((n, g) => n + g.produkty.length, 0))}`)
  console.log(`sec15 (Nesoulad kategorizace):     ${status(!!s.sec15, s.sec15?.kategorie.length)}`)

  console.log('\n=== KPI ===')
  console.log(JSON.stringify(report.kpi, null, 2))

  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
