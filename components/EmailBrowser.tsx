'use client'

import { useState, useEffect, useCallback } from 'react'

export interface EmailSummary {
  uid: number
  subject: string
  date: string
  seen: boolean
}

interface Props {
  activeType: string
  loadedDates: string[]
  loadedUids: Set<number>
  selectedUid: number | null
  onEmailClick: (email: EmailSummary) => void
}

export default function EmailBrowser({ activeType, loadedDates, loadedUids, selectedUid, onEmailClick }: Props) {
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEmails = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/emails?type=${encodeURIComponent(activeType)}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data: EmailSummary[] = await res.json()
      setEmails(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba při načítání')
    } finally {
      setLoading(false)
    }
  }, [activeType])

  useEffect(() => { loadEmails() }, [loadEmails])

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Emaily</p>
        <button
          onClick={loadEmails}
          disabled={loading}
          title="Obnovit seznam"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-gray-400">
            <svg className="mr-2 w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Načítám…
          </div>
        )}
        {!loading && error && <div className="px-3 py-4 text-xs text-red-500">{error}</div>}
        {!loading && !error && emails.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-400">Žádné emaily nenalezeny.</div>
        )}
        {!loading && !error && emails.length > 0 && (
          <ul>
            {emails.map((email) => {
              const dateStr = email.date.slice(0, 10)
              const isSelected = email.uid === selectedUid
              const isLoaded = loadedDates.includes(dateStr) || loadedUids.has(email.uid)
              return (
                <li key={email.uid}>
                  <button
                    onClick={() => onEmailClick(email)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-1">
                      <span className={`text-xs font-medium leading-snug ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {email.subject.length > 32 ? email.subject.slice(0, 32) + '…' : email.subject}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-gray-400">{dateStr}</span>
                      {isLoaded ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          v DB
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">nové</span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
