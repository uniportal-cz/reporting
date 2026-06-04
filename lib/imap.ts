import { ImapFlow } from 'imapflow'
import { simpleParser, ParsedMail } from 'mailparser'

export interface EmailSummary {
  uid: number
  subject: string
  from: string
  date: Date
  seen: boolean
  reportType: string
}

export interface EmailDetail extends EmailSummary {
  html: string | null
  text: string | null
  attachments: { filename: string; contentType: string; size: number }[]
}

function createClient() {
  return new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || '993'),
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

function subjectToReportType(subject: string): string {
  return subject?.trim() || 'Bez předmětu'
}

export async function fetchEmails(limit = 100): Promise<EmailSummary[]> {
  const client = createClient()
  const emails: EmailSummary[] = []

  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    const total = mailbox.exists

    if (total === 0) {
      return []
    }

    const start = Math.max(1, total - limit + 1)
    const range = `${start}:*`

    const messages = client.fetch(range, {
      uid: true,
      flags: true,
      envelope: true,
    })

    for await (const msg of messages) {
      emails.push({
        uid: msg.uid,
        subject: msg.envelope?.subject || '',
        from: msg.envelope?.from?.[0]?.address || '',
        date: msg.envelope?.date || new Date(),
        seen: msg.flags?.has('\\Seen') || false,
        reportType: subjectToReportType(msg.envelope?.subject || ''),
      })
    }

    return emails.sort((a, b) => b.date.getTime() - a.date.getTime())
  } finally {
    try {
      await client.logout()
    } catch {
      // ignore logout errors
    }
  }
}

export async function fetchEmailDetail(uid: number): Promise<EmailDetail | null> {
  const client = createClient()

  try {
    await client.connect()
    await client.mailboxOpen('INBOX')

    let result: EmailDetail | null = null

    for await (const msg of client.fetch(
      [uid],
      { uid: true, flags: true, envelope: true, source: true },
      { uid: true }
    )) {
      const parsed = await simpleParser(msg.source as Buffer)

      // Mark as seen
      try {
        await client.messageFlagsAdd([uid], ['\\Seen'], { uid: true })
      } catch {
        // ignore flag errors
      }

      result = {
        uid: msg.uid,
        subject: msg.envelope?.subject || '',
        from: msg.envelope?.from?.[0]?.address || '',
        date: msg.envelope?.date || new Date(),
        seen: true,
        reportType: subjectToReportType(msg.envelope?.subject || ''),
        html: parsed.html || null,
        text: parsed.text || null,
        attachments: (parsed.attachments || []).map((a) => ({
          filename: a.filename || 'příloha',
          contentType: a.contentType,
          size: a.size,
        })),
      }
    }

    return result
  } finally {
    try {
      await client.logout()
    } catch {
      // ignore logout errors
    }
  }
}
