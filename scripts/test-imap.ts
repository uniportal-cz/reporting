// scripts/test-imap.ts
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

async function main() {
  console.log('=== IMAP Test ===')
  console.log('Host:', process.env.IMAP_HOST)
  console.log('Port:', process.env.IMAP_PORT)
  console.log('User:', process.env.IMAP_USER)
  console.log()

  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: { user: process.env.IMAP_USER!, pass: process.env.IMAP_PASS! },
    logger: false,
    tls: { rejectUnauthorized: false },
  })

  await client.connect()
  const mailbox = await client.mailboxOpen('INBOX')
  console.log(`Total emails in INBOX: ${mailbox.exists}`)
  console.log()

  // List last 20
  const start = Math.max(1, mailbox.exists - 19)
  console.log(`Last 20 emails (seq ${start}:*):\n`)

  type Item = { uid: number; date: Date; subject: string; match: boolean }
  const items: Item[] = []

  for await (const msg of client.fetch(`${start}:*`, { uid: true, envelope: true })) {
    const subject = msg.envelope?.subject || '(no subject)'
    const date = msg.envelope?.date || new Date()
    const s = subject.toLowerCase()
    const match = s.includes('obchodní report') || s.includes('obchodni report')
    items.push({ uid: msg.uid, date, subject, match })
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime())

  for (const item of items) {
    const prefix = item.match ? '>>> MATCH' : '         '
    console.log(`${prefix} [uid:${item.uid}] [${item.date.toISOString().slice(0,10)}] ${item.subject}`)
  }

  const matches = items.filter(i => i.match)
  console.log(`\nMatched ${matches.length} / ${items.length} emails as "Obchodní report"`)

  if (matches.length > 0) {
    console.log('\nFetching first match to inspect HTML...')
    const best = matches[0]
    for await (const msg of client.fetch([best.uid], { uid: true, source: true }, { uid: true })) {
      const parsed = await simpleParser(msg.source as Buffer)
      const html = parsed.html || parsed.textAsHtml || ''
      console.log(`HTML length: ${html.length} chars`)
      console.log('First 500 chars:')
      console.log(html.slice(0, 500))
    }
  } else {
    console.log('\nNo matches found. Check the subject pattern in lib/report-types.ts')
    console.log('Hint: update matchSubject() to match the actual subject shown above.')
  }

  await client.logout()
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
