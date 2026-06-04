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
    tls: { rejectUnauthorized: false },
  })
}

/**
 * Fetch the most recent email whose subject matches the given filter.
 * subjectKeyword: passed to IMAP SEARCH SUBJECT (server-side, fast)
 * matchSubject: client-side filter applied after IMAP results
 */
export async function fetchLatestReportEmail(
  subjectKeyword?: string,
  matchSubject?: (subject: string) => boolean
): Promise<FetchedEmail | null> {
  const client = createClient()
  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    if (mailbox.exists === 0) return null

    let uids: number[] = []

    // Try IMAP server-side SUBJECT search first (efficient)
    if (subjectKeyword) {
      try {
        uids = await client.search({ subject: subjectKeyword }, { uid: true }) as number[]
      } catch {
        // some servers don't support SEARCH well — fall back to scan
        uids = []
      }
    }

    // If server search returned nothing, scan last 100 messages client-side
    if (uids.length === 0) {
      const start = Math.max(1, mailbox.exists - 99)
      for await (const msg of client.fetch(`${start}:*`, { uid: true, envelope: true })) {
        const subject = msg.envelope?.subject || ''
        const passes = matchSubject ? matchSubject(subject) : subject.toLowerCase().includes('report')
        if (passes) uids.push(msg.uid)
      }
    }

    if (uids.length === 0) return null

    // Fetch envelopes for candidates to find the most recent
    type Candidate = { uid: number; date: Date; subject: string }
    const candidates: Candidate[] = []

    for await (const msg of client.fetch(uids, { uid: true, envelope: true }, { uid: true })) {
      const subject = msg.envelope?.subject || ''
      // Apply client-side filter to reject false positives from server SEARCH
      if (matchSubject && !matchSubject(subject)) continue
      candidates.push({ uid: msg.uid, date: msg.envelope?.date || new Date(), subject })
    }

    if (candidates.length === 0) return null

    candidates.sort((a, b) => b.date.getTime() - a.date.getTime())
    return await fetchEmailByUid(client, candidates[0].uid)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }
}

/**
 * Fetch a report email closest to the given target date, matching the subject filter.
 */
export async function fetchReportEmailByDate(
  targetDate: Date,
  subjectKeyword?: string,
  matchSubject?: (subject: string) => boolean
): Promise<FetchedEmail | null> {
  const client = createClient()
  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    if (mailbox.exists === 0) return null

    const targetStr = format(targetDate, 'yyyy-MM-dd')
    let uids: number[] = []

    if (subjectKeyword) {
      try {
        uids = await client.search({ subject: subjectKeyword }, { uid: true }) as number[]
      } catch {
        uids = []
      }
    }

    if (uids.length === 0) {
      const start = Math.max(1, mailbox.exists - 199)
      for await (const msg of client.fetch(`${start}:*`, { uid: true, envelope: true })) {
        const subject = msg.envelope?.subject || ''
        const passes = matchSubject ? matchSubject(subject) : subject.toLowerCase().includes('report')
        if (passes) uids.push(msg.uid)
      }
    }

    if (uids.length === 0) return null

    type Candidate = { uid: number; date: Date; subject: string }
    const candidates: Candidate[] = []

    for await (const msg of client.fetch(uids, { uid: true, envelope: true }, { uid: true })) {
      const subject = msg.envelope?.subject || ''
      if (matchSubject && !matchSubject(subject)) continue
      candidates.push({ uid: msg.uid, date: msg.envelope?.date || new Date(), subject })
    }

    if (candidates.length === 0) return null

    const exact = candidates.find((c) => format(c.date, 'yyyy-MM-dd') === targetStr)
    if (exact) return await fetchEmailByUid(client, exact.uid)

    candidates.sort((a, b) =>
      Math.abs(a.date.getTime() - targetDate.getTime()) - Math.abs(b.date.getTime() - targetDate.getTime())
    )
    return await fetchEmailByUid(client, candidates[0].uid)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }
}

async function fetchEmailByUid(client: ImapFlow, uid: number): Promise<FetchedEmail | null> {
  for await (const msg of client.fetch([uid], { uid: true, envelope: true, source: true }, { uid: true })) {
    const parsed = await simpleParser(msg.source as Buffer)
    return {
      html: parsed.html || parsed.textAsHtml || '',
      date: msg.envelope?.date || new Date(),
      subject: msg.envelope?.subject || '',
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// EmailSummary — lightweight listing without fetching body
// ---------------------------------------------------------------------------

export interface EmailSummary {
  uid: number
  subject: string
  date: Date
  seen: boolean
}

/**
 * List report emails from IMAP without downloading bodies.
 * Returns results sorted newest-first, up to `limit` items.
 */
export async function listReportEmails(
  subjectKeyword?: string,
  matchSubject?: (subject: string) => boolean,
  limit = 50
): Promise<EmailSummary[]> {
  const client = createClient()
  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    if (mailbox.exists === 0) return []

    let uids: number[] = []

    if (subjectKeyword) {
      try {
        uids = await client.search({ subject: subjectKeyword }, { uid: true }) as number[]
      } catch {
        uids = []
      }
    }

    if (uids.length === 0) {
      const start = Math.max(1, mailbox.exists - 199)
      for await (const msg of client.fetch(`${start}:*`, { uid: true, envelope: true })) {
        const subject = msg.envelope?.subject || ''
        const passes = matchSubject ? matchSubject(subject) : subject.toLowerCase().includes('report')
        if (passes) uids.push(msg.uid)
      }
    }

    if (uids.length === 0) return []

    const results: EmailSummary[] = []

    for await (const msg of client.fetch(uids, { uid: true, envelope: true, flags: true }, { uid: true })) {
      const subject = msg.envelope?.subject || ''
      if (matchSubject && !matchSubject(subject)) continue
      results.push({
        uid: msg.uid,
        subject,
        date: msg.envelope?.date || new Date(),
        seen: msg.flags ? msg.flags.has('\\Seen') : false,
      })
    }

    results.sort((a, b) => b.date.getTime() - a.date.getTime())
    return results.slice(0, limit)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }
}

/**
 * Fetch a single email by UID using its own IMAP connection.
 */
export async function fetchEmailByUidPublic(uid: number): Promise<FetchedEmail | null> {
  const client = createClient()
  try {
    await client.connect()
    await client.mailboxOpen('INBOX')
    return await fetchEmailByUid(client, uid)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }
}
