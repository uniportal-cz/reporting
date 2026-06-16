import { google } from 'googleapis'

export const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email?: string
}

export interface SiteEntry {
  siteUrl: string
  permissionLevel: string
}

export interface UrlError {
  url: string
  errorType: '404' | '500'
  coverageState: string
  pageFetchState?: string
  lastCrawlTime?: string
}

export interface ErrorCache {
  siteUrl: string
  checkedAt: string
  errors: UrlError[]
  totalChecked: number
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/google/callback`,
  )
}

export function getGoogleAuthUrl(state: string): string {
  const client = makeOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: GSC_SCOPES,
    state,
    prompt: 'consent',
  })
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const client = makeOAuth2Client()
  const { tokens } = await client.getToken(code)
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Nepodařilo se získat tokeny od Google')
  }

  // Fetch user email via oauth2
  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const info = await oauth2.userinfo.get()

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    email: info.data.email ?? undefined,
  }
}

async function makeAuthenticatedClient(tokens: GoogleTokens) {
  const client = makeOAuth2Client()
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt,
  })
  return client
}

// ─── GSC API ──────────────────────────────────────────────────────────────────

export async function listGscSites(tokens: GoogleTokens): Promise<SiteEntry[]> {
  const auth = await makeAuthenticatedClient(tokens)
  const webmasters = google.webmasters({ version: 'v3', auth })
  const response = await webmasters.sites.list()
  return (response.data.siteEntry ?? [])
    .map((s) => ({ siteUrl: s.siteUrl ?? '', permissionLevel: s.permissionLevel ?? 'unknown' }))
    .filter((s) => s.siteUrl)
}

// Parse sitemap XML (handles both sitemap index and regular sitemaps)
async function fetchSitemapUrls(sitemapUrl: string, depth = 0): Promise<string[]> {
  if (depth > 2) return []
  try {
    const res = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DashboardBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const xml = await res.text()

    // Sitemap index
    const indexMatches = Array.from(xml.matchAll(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g))
    if (indexMatches.length > 0) {
      const nested: string[] = []
      for (const m of indexMatches.slice(0, 5)) {
        nested.push(...(await fetchSitemapUrls(m[1].trim(), depth + 1)))
      }
      return nested
    }

    // Regular sitemap
    return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1].trim())
  } catch { return [] }
}

// ─── Cache storage ────────────────────────────────────────────────────────────

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN
const DATA_BASE = process.env.VERCEL === '1' ? '/tmp' : process.cwd()

function cacheBlobPath(siteUrl: string) {
  const key = Buffer.from(siteUrl).toString('base64url').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `gsc-cache/${key}.json`
}

export async function loadErrorCache(siteUrl: string): Promise<ErrorCache | null> {
  const path = cacheBlobPath(siteUrl)
  if (USE_BLOB) {
    try {
      const { get } = await import('@vercel/blob')
      const result = await get(path, { access: 'private' })
      if (!result?.stream) return null
      return JSON.parse(await new Response(result.stream).text()) as ErrorCache
    } catch { return null }
  }
  const fs = require('fs') as typeof import('fs')
  const nodePath = require('path') as typeof import('path')
  const filePath = nodePath.join(DATA_BASE, 'data', path)
  if (!fs.existsSync(filePath)) return null
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ErrorCache } catch { return null }
}

export async function saveErrorCache(data: ErrorCache): Promise<void> {
  const path = cacheBlobPath(data.siteUrl)
  const json = JSON.stringify(data, null, 2)
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob')
    await put(path, json, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
    return
  }
  const fs = require('fs') as typeof import('fs')
  const nodePath = require('path') as typeof import('path')
  const filePath = nodePath.join(DATA_BASE, 'data', path)
  fs.mkdirSync(nodePath.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, json, 'utf8')
}

// ─── Error detection ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function getOrRefreshErrors(
  tokens: GoogleTokens,
  siteUrl: string,
  forceRefresh = false,
): Promise<ErrorCache> {
  if (!forceRefresh) {
    const cached = await loadErrorCache(siteUrl)
    if (cached && Date.now() - new Date(cached.checkedAt).getTime() < CACHE_TTL_MS) {
      return cached
    }
  }
  return refreshErrors(tokens, siteUrl)
}

async function refreshErrors(tokens: GoogleTokens, siteUrl: string): Promise<ErrorCache> {
  const auth = await makeAuthenticatedClient(tokens)
  const webmasters = google.webmasters({ version: 'v3', auth })
  const searchConsole = google.searchconsole({ version: 'v1', auth })

  // Gather URLs from sitemaps
  let urls: string[] = []
  try {
    const sitemapRes = await webmasters.sitemaps.list({ siteUrl })
    const sitemaps = (sitemapRes.data.sitemap ?? []).slice(0, 5)
    for (const sm of sitemaps) {
      if (sm.path) urls.push(...(await fetchSitemapUrls(sm.path)))
    }
  } catch { /* sitemaps unavailable */ }

  // Deduplicate and limit (URL Inspection API quota: 2000/day/property)
  urls = Array.from(new Set(urls)).filter((u) => u.startsWith('http')).slice(0, 300)

  const errors: UrlError[] = []
  const batchSize = 5

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const res = await searchConsole.urlInspection.index.inspect({
            requestBody: { siteUrl, inspectionUrl: url },
          })
          const result = res.data.inspectionResult
          const coverage = result?.indexStatusResult?.coverageState ?? ''
          const fetchState = result?.indexStatusResult?.pageFetchState ?? ''
          const lastCrawl = result?.indexStatusResult?.lastCrawlTime ?? undefined

          const is404 =
            fetchState === 'NOT_FOUND' ||
            fetchState === 'SOFT_404' ||
            coverage.toLowerCase().includes('not found')
          const is500 =
            fetchState === 'SERVER_ERROR' ||
            coverage.toLowerCase().includes('server error') ||
            coverage.toLowerCase().includes('5xx')

          if (is404) {
            errors.push({ url, errorType: '404', coverageState: coverage, pageFetchState: fetchState, lastCrawlTime: lastCrawl ?? undefined })
          } else if (is500) {
            errors.push({ url, errorType: '500', coverageState: coverage, pageFetchState: fetchState, lastCrawlTime: lastCrawl ?? undefined })
          }
        } catch { /* skip failed inspections */ }
      }),
    )
    // Respect API rate limits
    if (i + batchSize < urls.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  const result: ErrorCache = {
    siteUrl,
    checkedAt: new Date().toISOString(),
    errors,
    totalChecked: urls.length,
  }
  await saveErrorCache(result)
  return result
}
