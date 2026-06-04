'use client'

import { EmailSummary } from '@/lib/imap'

interface ReportTypeListProps {
  grouped: Record<string, EmailSummary[]>
  selectedType: string | null
  onSelect: (type: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function ReportTypeList({
  grouped,
  selectedType,
  onSelect,
  searchQuery,
  onSearchChange,
}: ReportTypeListProps) {
  const types = Object.keys(grouped).sort((a, b) => {
    // Sort by unread count desc, then alphabetically
    const unreadA = grouped[a].filter((e) => !e.seen).length
    const unreadB = grouped[b].filter((e) => !e.seen).length
    if (unreadB !== unreadA) return unreadB - unreadA
    return a.localeCompare(b, 'cs')
  })

  const filteredTypes = types.filter((type) =>
    type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalEmails = Object.values(grouped).reduce((sum, emails) => sum + emails.length, 0)
  const totalUnread = Object.values(grouped).reduce(
    (sum, emails) => sum + emails.filter((e) => !e.seen).length,
    0
  )

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{totalEmails} emailů celkem</span>
          {totalUnread > 0 && (
            <span className="text-blue-400 font-medium">{totalUnread} nepřečtených</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Hledat typy reportů..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTypes.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
            {searchQuery ? 'Žádné výsledky' : 'Žádné reporty'}
          </div>
        ) : (
          <ul className="space-y-0.5 px-2 pb-4">
            {filteredTypes.map((type) => {
              const emails = grouped[type]
              const unread = emails.filter((e) => !e.seen).length
              const isSelected = selectedType === type

              return (
                <li key={type}>
                  <button
                    onClick={() => onSelect(type)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2 group ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-sm truncate flex-1" title={type}>
                      {unread > 0 && !isSelected && (
                        <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2 flex-shrink-0 align-middle" />
                      )}
                      {type}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {unread > 0 && (
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-blue-400 text-blue-900'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          {unread}
                        </span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-blue-500 text-blue-100'
                            : 'bg-slate-600 text-slate-400 group-hover:bg-slate-500 group-hover:text-slate-300'
                        }`}
                      >
                        {emails.length}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
