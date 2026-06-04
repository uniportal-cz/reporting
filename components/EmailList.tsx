'use client'

import { EmailSummary } from '@/lib/imap'

interface EmailListProps {
  emails: EmailSummary[]
  reportType: string
  onSelectEmail: (uid: number) => void
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (isToday) {
    return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  return d.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EmailList({ emails, reportType, onSelectEmail }: EmailListProps) {
  const unread = emails.filter((e) => !e.seen).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 truncate">{reportType}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {emails.length} {emails.length === 1 ? 'email' : emails.length < 5 ? 'emaily' : 'emailů'}
              {unread > 0 && (
                <span className="ml-2 text-blue-600 font-medium">• {unread} nepřečtených</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Žádné emaily</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {emails.map((email) => (
              <li key={email.uid}>
                <button
                  onClick={() => onSelectEmail(email.uid)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!email.seen && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm truncate ${
                            !email.seen
                              ? 'font-semibold text-gray-900'
                              : 'font-normal text-gray-700'
                          }`}
                        >
                          {email.subject || '(bez předmětu)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">{email.from}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(email.date)}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
