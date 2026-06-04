'use client'

import { useEffect, useRef, useState } from 'react'

interface Attachment {
  filename: string
  contentType: string
  size: number
}

interface EmailDetailData {
  uid: number
  subject: string
  from: string
  date: Date | string
  seen: boolean
  reportType: string
  html: string | null
  text: string | null
  attachments: Attachment[]
}

interface EmailModalProps {
  uid: number
  onClose: () => void
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EmailModal({ uid, onClose }: EmailModalProps) {
  const [email, setEmail] = useState<EmailDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setEmail(null)

    fetch(`/api/email/${uid}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setEmail(data)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Nepodařilo se načíst email')
      })
      .finally(() => setLoading(false))
  }, [uid])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleIframeLoad = () => {
    if (iframeRef.current?.contentWindow) {
      const height = iframeRef.current.contentWindow.document.body?.scrollHeight
      if (height) {
        iframeRef.current.style.height = `${height + 32}px`
      }
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative flex flex-col min-h-0 mb-8">
        {/* Modal header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
            ) : (
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {email?.subject || '(bez předmětu)'}
              </h2>
            )}
            {email && !loading && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-600">
                <span>
                  <span className="font-medium text-gray-700">Od:</span> {email.from}
                </span>
                <span>
                  <span className="font-medium text-gray-700">Datum:</span> {formatDate(email.date)}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {email.reportType}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Zavřít"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Attachments */}
        {email && email.attachments.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-200 bg-amber-50">
            <p className="text-xs font-medium text-amber-700 mb-2">
              Přílohy ({email.attachments.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-gray-600"
                >
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="font-medium">{att.filename}</span>
                  <span className="text-gray-400">({formatSize(att.size)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto rounded-b-xl">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Načítám email...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-700 font-medium">Chyba při načítání</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && email && (
            <>
              {email.html ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={email.html}
                  className="w-full border-0 rounded-b-xl"
                  style={{ minHeight: '400px' }}
                  sandbox="allow-same-origin"
                  onLoad={handleIframeLoad}
                  title={`Email: ${email.subject}`}
                />
              ) : email.text ? (
                <pre className="px-6 py-5 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {email.text}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Žádný obsah k zobrazení</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
