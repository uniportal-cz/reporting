import { fetchEmailDetail } from '@/lib/imap'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { uid: string }
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

export default async function ReportDetailPage({ params }: Props) {
  const uid = parseInt(params.uid)
  if (isNaN(uid)) notFound()

  let email = null
  let error: string | null = null

  try {
    email = await fetchEmailDetail(uid)
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Nepodařilo se načíst email'
  }

  if (!email && !error) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zpět na dashboard
        </Link>
        <span className="text-slate-600">|</span>
        <h1 className="text-lg font-semibold truncate">{email?.subject || 'Detail reportu'}</h1>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-700 font-medium">Chyba při načítání emailu</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <Link href="/" className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
              Zpět na dashboard
            </Link>
          </div>
        ) : email ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Email meta */}
            <div className="border-b border-gray-200 px-6 py-5 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{email.subject || '(bez předmětu)'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Od:</span>
                  <span>{email.from}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Datum:</span>
                  <span>{formatDate(email.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Typ reportu:</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {email.reportType}
                  </span>
                </div>
              </div>

              {email.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Přílohy ({email.attachments.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {email.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="font-medium">{att.filename}</span>
                        <span className="text-gray-400">({formatSize(att.size)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email content */}
            <div className="p-0">
              {email.html ? (
                <iframe
                  srcDoc={email.html}
                  className="w-full border-0"
                  style={{ minHeight: '600px', height: 'auto' }}
                  sandbox="allow-same-origin"
                  onLoad={(e) => {
                    const iframe = e.currentTarget
                    if (iframe.contentWindow) {
                      iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px'
                    }
                  }}
                />
              ) : email.text ? (
                <pre className="px-6 py-5 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {email.text}
                </pre>
              ) : (
                <div className="px-6 py-10 text-center text-gray-400">
                  <p>Žádný obsah k zobrazení</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
