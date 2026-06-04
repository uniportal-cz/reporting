import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const isVercel = process.env.VERCEL === '1'
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
  const hasImap = !!(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASS)

  let backend: string
  let persistent: boolean
  let detail: string

  if (hasBlobToken) {
    backend = 'Vercel Blob'
    persistent = true
    detail = 'Data jsou trvale uložena v Vercel Blob storage.'
  } else if (isVercel) {
    backend = '/tmp (ephemeral)'
    persistent = false
    detail = 'BLOB_READ_WRITE_TOKEN není nastaven. Data se ukládají do /tmp a zaniknou při restartu funkce. Nastav Vercel Blob store.'
  } else {
    backend = 'filesystem (lokální)'
    persistent = true
    detail = 'Lokální vývoj — data se ukládají do ./data/reports/'
  }

  // Try a write+read round-trip
  let writeTest: { ok: boolean; error?: string } = { ok: false }
  try {
    const { saveReport, loadReport } = await import('@/lib/storage')
    const testReport = {
      date: '0000-00-00',
      reportType: '__healthcheck__',
      fetchedAt: new Date().toISOString(),
      kpi: { sec1_count: 0, sec4_count: 0, sec14_count: 0, sec13_count: 0, sec9_terms: 0 },
      sections: {},
    }
    await saveReport(testReport)
    const readBack = await loadReport('0000-00-00')
    writeTest = readBack ? { ok: true } : { ok: false, error: 'Zápis proběhl ale čtení vrátilo null' }
  } catch (e) {
    writeTest = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  return NextResponse.json({
    backend,
    persistent,
    detail,
    imap: {
      configured: hasImap,
      host: process.env.IMAP_HOST || null,
      user: process.env.IMAP_USER || null,
    },
    writeTest,
    env: {
      VERCEL: isVercel,
      BLOB_READ_WRITE_TOKEN: hasBlobToken ? '✓ nastaven' : '✗ chybí',
      IMAP_HOST: process.env.IMAP_HOST || '✗ chybí',
      IMAP_USER: process.env.IMAP_USER || '✗ chybí',
      IMAP_PASS: process.env.IMAP_PASS ? '✓ nastaven' : '✗ chybí',
    },
  })
}
