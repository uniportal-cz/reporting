export interface ReportTypeConfig {
  id: string
  label: string
  // Returns true if the email subject belongs to this type
  matchSubject: (subject: string) => boolean
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: 'obchodni',
    label: 'Obchodní',
    matchSubject: () => true, // default — catches all until more types are added
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
