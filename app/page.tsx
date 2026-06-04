import { fetchEmails, EmailSummary } from '@/lib/imap'
import Dashboard from '@/components/Dashboard'

export const revalidate = 60 // revalidate every 60s

export default async function Home() {
  let emails: EmailSummary[] = []
  let error: string | null = null

  try {
    emails = await fetchEmails(200)
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Nepodařilo se načíst emaily'
  }

  // Group by report type
  const grouped = emails.reduce<Record<string, EmailSummary[]>>((acc, email) => {
    if (!acc[email.reportType]) acc[email.reportType] = []
    acc[email.reportType].push(email)
    return acc
  }, {})

  return <Dashboard grouped={grouped} error={error} />
}
