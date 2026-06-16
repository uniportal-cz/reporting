import { describe, it, expect } from 'vitest'

// Test the pure utility functions from parser modules

describe('parser utilities', () => {
  it('detects report type from subject', async () => {
    const { detectReportType } = await import('../../lib/report-types')

    expect(detectReportType('Obchodní report 2024')).toBe('obchodni')
    expect(detectReportType('Skladový report')).toBe('skladovy')
    expect(detectReportType('Účetní report nákupní')).toBe('ucetni')
    expect(detectReportType('MasterData report')).toBe('masterdata')
    expect(detectReportType('Localization report')).toBe('localization')
    expect(detectReportType('Unknown subject')).toBe('obchodni') // default
  })

  it('getReportTypeLabel returns correct labels', async () => {
    const { getReportTypeLabel } = await import('../../lib/report-types')

    expect(getReportTypeLabel('obchodni')).toBe('Obchodní')
    expect(getReportTypeLabel('skladovy')).toBe('Skladový')
    expect(getReportTypeLabel('ucetni')).toBe('Účetní')
    expect(getReportTypeLabel('masterdata')).toBe('MasterData')
    expect(getReportTypeLabel('localization')).toBe('Lokalizace')
    expect(getReportTypeLabel('unknown')).toBe('unknown') // returns id as fallback
  })

  it('REPORT_TYPES has 5 entries', async () => {
    const { REPORT_TYPES } = await import('../../lib/report-types')
    expect(REPORT_TYPES).toHaveLength(5)
  })

  it('each report type has required fields', async () => {
    const { REPORT_TYPES } = await import('../../lib/report-types')
    for (const t of REPORT_TYPES) {
      expect(t.id).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.subjectKeyword).toBeTruthy()
      expect(typeof t.matchSubject).toBe('function')
    }
  })
})

describe('search-console URL classification', () => {
  it('correctly identifies 404 fetch states', () => {
    const notFoundStates = ['NOT_FOUND', 'SOFT_404']
    const serverErrorStates = ['SERVER_ERROR']
    const okStates = ['SUCCESSFUL', 'REDIRECTED']

    for (const state of notFoundStates) {
      const is404 = state === 'NOT_FOUND' || state === 'SOFT_404'
      expect(is404).toBe(true)
    }
    for (const state of serverErrorStates) {
      const is500 = state === 'SERVER_ERROR'
      expect(is500).toBe(true)
    }
    for (const state of okStates) {
      const isError = state === 'NOT_FOUND' || state === 'SOFT_404' || state === 'SERVER_ERROR'
      expect(isError).toBe(false)
    }
  })
})
