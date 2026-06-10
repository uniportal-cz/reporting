export interface ReportTypeConfig {
  id: string
  label: string
  // Keyword searched in IMAP SUBJECT — keep ASCII-safe for server compatibility
  subjectKeyword: string
  // Client-side subject match (broader fallback)
  matchSubject: (subject: string) => boolean
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: 'obchodni',
    label: 'Obchodní',
    subjectKeyword: 'Obchodn',
    matchSubject: (subject: string) => {
      const s = subject.toLowerCase()
      return s.includes('obchodní report') || s.includes('obchodni report')
    },
  },
  {
    id: 'skladovy',
    label: 'Skladový',
    subjectKeyword: 'Skladov',
    matchSubject: (subject: string) => {
      const s = subject.toLowerCase()
      return s.includes('skladový report') || s.includes('skladovy report')
    },
  },
  {
    id: 'ucetni',
    label: 'Účetní',
    subjectKeyword: 'etni report',
    matchSubject: (subject: string) => {
      const s = subject.toLowerCase()
      return (s.includes('účetní report') || s.includes('ucetni report')) && s.includes('nákupní')
    },
  },
  {
    id: 'masterdata',
    label: 'MasterData',
    subjectKeyword: 'MasterData report',
    matchSubject: (subject: string) => {
      return subject.toLowerCase().includes('masterdata report')
    },
  },
]

export const DEFAULT_REPORT_TYPE = 'obchodni'

export function detectReportType(subject: string): string {
  for (const t of REPORT_TYPES) {
    if (t.matchSubject(subject)) return t.id
  }
  return DEFAULT_REPORT_TYPE
}

export function getReportTypeLabel(id: string): string {
  return REPORT_TYPES.find((t) => t.id === id)?.label ?? id
}

export function getReportTypeConfig(id: string): ReportTypeConfig | undefined {
  return REPORT_TYPES.find((t) => t.id === id)
}
