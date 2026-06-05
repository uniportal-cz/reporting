/**
 * scripts/save-email-html.ts
 *
 * Connects to IMAP, finds the first "Obchodní report" email,
 * and saves its HTML to data/debug-email.html for inspection.
 *
 * Run with:  npx tsx scripts/save-email-html.ts
 *
 * Optional: pass a UID as the first argument to fetch a specific email:
 *   npx tsx scripts/save-email-html.ts 12345
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { fetchLatestReportEmail } from '../lib/imap'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

async function fetchByUid(uid: number): Promise<{ html: string; subject: string; date: Date } | null> {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASS!,
    },
    logger: false,
    tls: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    await client.mailboxOpen('INBOX')

    let html = ''
    let subject = ''
    let date = new Date()

    for await (const msg of client.fetch({ uid: uid.toString() }, { source: true, envelope: true }, { uid: true })) {
      subject = msg.envelope?.subject || `UID ${uid}`
      date = msg.envelope?.date || new Date()
      if (msg.source) {
        const parsed = await simpleParser(msg.source)
        html = (parsed as any).html || (parsed as any).textAsHtml || ''
      }
    }

    return html ? { html, subject, date } : null
  } finally {
    await client.logout()
  }
}

async function main() {
  const specificUid = process.argv[2] ? parseInt(process.argv[2], 10) : null

  console.log('=== Save Email HTML ===')

  let fetched: { html: string; subject: string; date: Date } | null = null

  if (specificUid) {
    console.log(`Fetching email by UID: ${specificUid}`)
    fetched = await fetchByUid(specificUid)
  } else {
    console.log('Fetching latest "Obchodní report" email...')
    fetched = await fetchLatestReportEmail(
      'Obchodn',
      (subject: string) => {
        const s = subject.toLowerCase()
        return s.includes('obchodní report') || s.includes('obchodni report')
      }
    )
  }

  if (!fetched) {
    console.error('No matching email found.')
    console.error('Check IMAP credentials in .env.local and that IMAP_HOST/IMAP_USER/IMAP_PASS are set.')
    process.exit(1)
  }

  console.log(`\nFound email:`)
  console.log(`  Subject: ${fetched.subject}`)
  console.log(`  Date:    ${fetched.date.toISOString()}`)
  console.log(`  HTML length: ${fetched.html.length} chars`)

  // Ensure data/ directory exists
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const outPath = path.join(dataDir, 'debug-email.html')
  fs.writeFileSync(outPath, fetched.html, 'utf8')

  console.log(`\nSaved to: ${outPath}`)
  console.log('\nNext steps:')
  console.log('  1. Open data/debug-email.html in a browser or text editor')
  console.log('  2. Search for section headings (h2 tags) to verify heading text')
  console.log('  3. Check table structure for columns that differ from expected')
  console.log('  4. Use /api/debug/parse?uid=UID for live parser inspection\n')
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
