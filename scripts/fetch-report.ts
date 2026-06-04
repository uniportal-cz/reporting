import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { fetchLatestReportEmail } from '../lib/imap'
import { parseReportEmail } from '../lib/parser'
import { saveReport } from '../lib/storage'
import { format } from 'date-fns'

async function main() {
  console.log('[fetch-report] Starting...')
  console.log(`[fetch-report] IMAP host: ${process.env.IMAP_HOST}`)
  console.log(`[fetch-report] IMAP user: ${process.env.IMAP_USER}`)

  let targetDate: Date | undefined

  // Optional CLI arg: node fetch-report.ts 2024-01-15
  if (process.argv[2]) {
    targetDate = new Date(process.argv[2])
    if (isNaN(targetDate.getTime())) {
      console.error('[fetch-report] Invalid date argument:', process.argv[2])
      process.exit(1)
    }
    console.log(`[fetch-report] Fetching report for date: ${format(targetDate, 'yyyy-MM-dd')}`)
  }

  try {
    const fetched = await fetchLatestReportEmail()

    if (!fetched) {
      console.error('[fetch-report] No report email found in inbox')
      process.exit(1)
    }

    console.log(`[fetch-report] Found email: "${fetched.subject}" from ${fetched.date.toISOString()}`)

    const date = format(fetched.date, 'yyyy-MM-dd')
    const fetchedAt = new Date().toISOString()

    const report = parseReportEmail(fetched.html, date, fetchedAt)

    console.log(`[fetch-report] Parsed report for ${date}`)
    console.log('[fetch-report] KPI:', JSON.stringify(report.kpi, null, 2))

    const sectionNames = Object.keys(report.sections).filter(
      (k) => report.sections[k as keyof typeof report.sections] !== undefined
    )
    console.log(`[fetch-report] Sections found: ${sectionNames.join(', ') || 'none'}`)

    saveReport(report)
    console.log(`[fetch-report] Saved to data/reports/${date}.json`)
    console.log('[fetch-report] Done.')
  } catch (error) {
    console.error('[fetch-report] Error:', error)
    process.exit(1)
  }
}

main()
