'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EmailSummary } from '@/lib/imap'
import ReportTypeList from './ReportTypeList'
import EmailList from './EmailList'
import EmailModal from './EmailModal'

interface DashboardProps {
  grouped: Record<string, EmailSummary[]>
  error: string | null
}

function formatRefreshTime(date: Date): string {
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Dashboard({ grouped, error }: DashboardProps) {
  const [selectedType, setSelectedType] = useState<string | null>(() => {
    const types = Object.keys(grouped)
    return types.length > 0 ? types[0] : null
  })
  const [selectedUid, setSelectedUid] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [refreshedAt] = useState(new Date())
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type)
    setSelectedUid(null)
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [])

  const handleSelectEmail = useCallback((uid: number) => {
    setSelectedUid(uid)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedUid(null)
    // Refresh the page to update seen status
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  const currentEmails = selectedType ? (grouped[selectedType] || []) : []
  const typeCount = Object.keys(grouped).length
  const totalUnread = Object.values(grouped).reduce(
    (sum, emails) => sum + emails.filter((e) => !e.seen).length,
    0
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          flex-shrink-0 bg-slate-900 flex flex-col transition-all duration-300 overflow-hidden
          ${sidebarOpen ? 'w-72' : 'w-0 md:w-14'}
        `}
      >
        {/* Sidebar header */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-700 ${!sidebarOpen && 'md:justify-center'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm leading-tight">Report Dashboard</h1>
              <p className="text-slate-400 text-xs mt-0.5">{typeCount} typů reportů</p>
            </div>
          )}
        </div>

        {/* Report type list - only show when expanded */}
        {sidebarOpen && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ReportTypeList
              grouped={grouped}
              selectedType={selectedType}
              onSelect={handleSelectType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          {/* Toggle sidebar button */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={sidebarOpen ? 'Skrýt panel' : 'Zobrazit panel'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900 hidden sm:block">Report Dashboard</h1>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  {totalUnread} nových
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 hidden sm:flex">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Obnoveno {formatRefreshTime(refreshedAt)}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isPending ? 'Obnovuji...' : 'Obnovit'}</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md w-full text-center">
                <svg className="w-14 h-14 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-lg font-semibold text-red-800 mb-2">Chyba připojení</h2>
                <p className="text-red-600 text-sm mb-2">Nepodařilo se připojit k emailovému serveru.</p>
                <p className="text-red-500 text-xs font-mono bg-red-100 rounded px-3 py-2 mb-5 break-all">{error}</p>
                <button
                  onClick={handleRefresh}
                  disabled={isPending}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isPending ? 'Zkouším znovu...' : 'Zkusit znovu'}
                </button>
              </div>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-500">Žádné emaily</p>
              <p className="text-sm mt-1">Schránka je prázdná nebo nebyly nalezeny žádné reporty.</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Obnovit
              </button>
            </div>
          ) : selectedType ? (
            <div className="h-full bg-white">
              <EmailList
                emails={currentEmails}
                reportType={selectedType}
                onSelectEmail={handleSelectEmail}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
              </svg>
              <p className="text-base font-medium text-gray-500">Vyberte typ reportu</p>
              <p className="text-sm mt-1">Klikněte na typ v levém panelu</p>
            </div>
          )}
        </main>
      </div>

      {/* Email detail modal */}
      {selectedUid !== null && (
        <EmailModal uid={selectedUid} onClose={handleCloseModal} />
      )}
    </div>
  )
}
