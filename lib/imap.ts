import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { format } from 'date-fns'

export interface FetchedEmail {
  html: string
  date: Date
  subject: string
}

function createClient(): ImapFlow {
  return new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASS!,
    },
    logger: false,
    tls: {
      rejectUnauthorized: false,
    },
  })
}

/** Detect whether a subject looks like a report email */
function isReportSubject(subject: string): boolean {
  const s = subject.toLowerCase()
  return (
    s.includes('report') ||
    s.includes('doprodej') ||
    s.includes('dashboard') ||
    s.includes('sportega') ||
    /\d{4}-\d{2}-\d{2}/.test(s)
  )
}

/**
 * Fetch the most recent report email from INBOX.
 */
export async function fetchLatestReportEmail(): Promise<FetchedEmail | null> {
  const client = createClient()
  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    const total = mailbox.exists

    if (total === 0) return null

    // Scan last 50 messages for one that matches report subject
    const start = Math.max(1, total - 49)
    const range = `${start}:*`

    type Candidate = { uid: number; date: Date; subject: string }
    const candidates: Candidate[] = []

    for await (const msg of client.fetch(range, { uid: true, envelope: true })) {
      const subject = msg.envelope?.subject || ''
      if (isReportSubject(subject)) {
        candidates.push({
          uid: msg.uid,
          date: msg.envelope?.date || new Date(),
          subject,
        })
      }
    }

    if (candidates.length === 0) {
      // Fall back to the most recent message
      const lastMsg = await fetchEmailBySeq(client, total)
      return lastMsg
    }

    // Pick latest
    candidates.sort((a, b) => b.date.getTime() - a.date.getTime())
    const best = candidates[0]
    return await fetchEmailByUid(client, best.uid)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }
}

/**
 * Fetch a report email closest to the given target date.
 */
export async function fetchReportEmailByDate(targetDate: Date): Promise<FetchedEmail | null> {
  const client = createClient()
  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    const total = mailbox.exists

    if (total === 0) return null

    const targetStr = format(targetDate, 'yyyy-MM-dd')
    const start = Math.max(1, total - 200)
    const range = `${start}:*`

    type Candidate = { uid: number; date: Date; subject: string; diff: number }
    const candidates: Candidate[] = []

    for await (const msg of client.fetch(range, { uid: true, envelope: true })) {
      const subject = msg.envelope?.subject || ''
      const date = msg.envelope?.date || new Date()
      if (!isReportSubject(subject)) continue
      const diff = Math.abs(date.getTime() - targetDate.getTime())
      candidates.push({ uid: msg.uid, date, subject, diff })
    }

    if (candidates.length === 0) return null

    // Prefer exact date match, then closest
    const exact = candidates.find((c) => format(c.date, 'yyyy-MM-dd') === targetStr)
    const best = exact || candidates.sort((a, b) => a.diff - b.diff)[0]

    return await fetchEmailByUid(client, best.uid)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }
}

async function fetchEmailByUid(client: ImapFlow, uid: number): Promise<FetchedEmail | null> {
  for await (const msg of client.fetch([uid], { uid: true, envelope: true, source: true }, { uid: true })) {
    const parsed = await simpleParser(msg.source as Buffer)
    const html = parsed.html || (parsed.textAsHtml ?? '') || ''
    return {
      html,
      date: msg.envelope?.date || new Date(),
      subject: msg.envelope?.subject || '',
    }
  }
  return null
}

async function fetchEmailBySeq(client: ImapFlow, seq: number): Promise<FetchedEmail | null> {
  for await (const msg of client.fetch(`${seq}:${seq}`, { uid: true, envelope: true, source: true })) {
    const parsed = await simpleParser(msg.source as Buffer)
    const html = parsed.html || (parsed.textAsHtml ?? '') || ''
    return {
      html,
      date: msg.envelope?.date || new Date(),
      subject: msg.envelope?.subject || '',
    }
  }
  return null
}
