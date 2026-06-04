'use client'

import { useState, useEffect, useCallback } from 'react'

interface EmailSummary {
  uid: number
  subject: string
  date: string
  seen: boolean
}

interface Props {
  activeType: string
  loadedDates: string[]
  onReportLoaded: (date: string) => void
}

export default function EmailBrowser({ activeType, loadedDates, onReportLoaded }: Props) {
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUid, setSelectedUid] = useState<number | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

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
      setSelectedUid(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba při načítání')
    } finally {
      setLoading(false)
    }
  }, [activeType])

  useEffect(() => {
    loadEmails()
  }, [loadEmails])

  const handleLoad = useCallback(async () => {
    if (selectedUid === null) return
    setFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/fetch-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: selectedUid, reportType: activeType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || 'Chyba při stahování')
      } else {
        onReportLoaded(data.date)
      }
    } catch {
      setFetchError('Síťová chyba')
    } finally {
      setFetching(false)
    }
  }, [selectedUid, activeType, onReportLoaded])

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Emaily</p>
        <button
          onClick={loadEmails}
          disabled={loading}
          title="Obnovit seznam"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-gray-400">
            <svg className="mr-2 w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Načítám…
          </div>
        )}

        {!loading && error && (
          <div className="px-3 py-4 text-xs text-red-500">{error}</div>
        )}

        {!loading && !error && emails.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-400">
            Žádné emaily nenalezeny.
          </div>
        )}

        {!loading && !error && emails.length > 0 && (
          <ul>
            {emails.map((email) => {
              const dateStr = email.date.slice(0, 10)
              const isSelected = email.uid === selectedUid
              const isLoaded = loadedDates.includes(dateStr)
              const shortSubject = email.subject.length > 30
                ? email.subject.slice(0, 30) + '…'
                : email.subject

              return (
                <li key={email.uid}>
                  <button
                    onClick={() => setSelectedUid(email.uid === selectedUid ? null : email.uid)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-50 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-medium flex-1 truncate ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {shortSubject}
                      </span>
                      {isLoaded && (
                        <span title="Již načteno" className="flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">{dateStr}</div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer: load button */}
      <div className="flex-shrink-0 border-t border-gray-100 p-2 space-y-1.5">
        {fetchError && (
          <div className="text-xs text-red-500 px-1">{fetchError}</div>
        )}
        <button
          onClick={handleLoad}
          disabled={selectedUid === null || fetching}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
        >
          {fetching ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Načítám…
            </>
          ) : (
            'Načíst vybraný'
          )}
        </button>
      </div>
    </aside>
  )
}
