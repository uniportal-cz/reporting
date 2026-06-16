'use client'

import { useState, useEffect } from 'react'
import type { SiteEntry, UrlError, ErrorCache } from '@/lib/search-console'

interface Props {
  hasGoogleTokens: boolean
  googleEmail?: string
}

export default function SearchConsoleClient({ hasGoogleTokens, googleEmail }: Props) {
  const [sites, setSites] = useState<SiteEntry[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [errorsCache, setErrorsCache] = useState<Record<string, ErrorCache>>({})
  const [errorsLoading, setErrorsLoading] = useState(false)
  const [errorsError, setErrorsError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | '404' | '500'>('all')

  useEffect(() => {
    if (hasGoogleTokens) loadSites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGoogleTokens])

  async function loadSites() {
    setSitesLoading(true)
    setSitesError(null)
    const r = await fetch('/api/search-console/sites')
    if (r.ok) {
      setSites(await r.json())
    } else {
      const d = await r.json()
      setSitesError(d.error ?? 'Chyba při načítání domén')
    }
    setSitesLoading(false)
  }

  async function loadErrors(siteUrl: string, forceRefresh = false) {
    setErrorsLoading(true)
    setErrorsError(null)
    setSelectedSite(siteUrl)
    const params = new URLSearchParams({ site: siteUrl })
    if (forceRefresh) params.set('refresh', '1')
    const r = await fetch(`/api/search-console/errors?${params}`)
    if (r.ok) {
      const data: ErrorCache = await r.json()
      setErrorsCache((prev) => ({ ...prev, [siteUrl]: data }))
    } else {
      const d = await r.json()
      setErrorsError(d.error ?? 'Chyba při načítání chyb')
    }
    setErrorsLoading(false)
  }

  const current = selectedSite ? errorsCache[selectedSite] : null
  const filteredErrors = current
    ? current.errors.filter((e) => filterType === 'all' || e.errorType === filterType)
    : []

  if (!hasGoogleTokens) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-gray-400 text-5xl">🔍</div>
        <h2 className="text-xl font-semibold text-gray-700">Připojte Google účet</h2>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Pro zobrazení chyb ze Search Console je potřeba propojit váš Google účet.
          Budou načteny domény, ke kterým máte přístup ve Search Console.
        </p>
        <a
          href="/api/google/connect"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Připojit Google Search Console
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connected account */}
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-sm text-green-800">
            Google účet připojen{googleEmail ? `: ${googleEmail}` : ''}
          </span>
        </div>
        <a href="/api/google/connect"
          className="text-xs text-green-600 hover:underline">Znovu připojit</a>
      </div>

      {/* Sites list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Domény ({sites.length})</h2>
          <button onClick={loadSites} disabled={sitesLoading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50">
            {sitesLoading ? 'Načítám…' : 'Obnovit'}
          </button>
        </div>

        {sitesError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-3">
            {sitesError}
          </div>
        )}

        {sitesLoading && (
          <p className="text-sm text-gray-400">Načítám domény…</p>
        )}

        {!sitesLoading && sites.length === 0 && !sitesError && (
          <p className="text-sm text-gray-400">Žádné domény nenalezeny ve Search Console.</p>
        )}

        <div className="grid gap-2">
          {sites.map((site) => {
            const cache = errorsCache[site.siteUrl]
            const isSelected = selectedSite === site.siteUrl
            const errorCount = cache?.errors.length ?? null

            return (
              <div key={site.siteUrl}
                className={`border rounded-lg px-4 py-3 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-400 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => !errorsLoading && loadErrors(site.siteUrl)}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{site.siteUrl}</p>
                  <p className="text-xs text-gray-400">{site.permissionLevel}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {cache && (
                    <span className="text-xs text-gray-400">
                      {new Date(cache.checkedAt).toLocaleString('cs', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {errorCount !== null && (
                    <span className={`text-sm font-semibold ${errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {errorCount > 0 ? `${errorCount} chyb` : '✓ OK'}
                    </span>
                  )}
                  {isSelected && errorsLoading ? (
                    <span className="text-xs text-gray-400">Kontroluji…</span>
                  ) : (
                    <span className="text-xs text-blue-600">
                      {cache ? 'Zkontrolovat znovu' : 'Zkontrolovat'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Errors detail */}
      {selectedSite && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{selectedSite}</h3>
              {current && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Zkontrolováno {new Date(current.checkedAt).toLocaleString('cs')} — {current.totalChecked} URL
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="flex text-xs border rounded overflow-hidden">
                {(['all', '404', '500'] as const).map((t) => (
                  <button key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 transition-colors ${
                      filterType === t ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t === 'all' ? 'Vše' : t}
                  </button>
                ))}
              </div>
              <button
                onClick={() => loadErrors(selectedSite, true)}
                disabled={errorsLoading}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                Obnovit
              </button>
            </div>
          </div>

          {errorsError && (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50">{errorsError}</div>
          )}

          {errorsLoading && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Kontroluji URL adresy… Toto může trvat několik minut.
            </div>
          )}

          {!errorsLoading && current && filteredErrors.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-green-600 font-medium">✓ Žádné chyby nenalezeny</p>
              <p className="text-sm text-gray-400 mt-1">
                Z {current.totalChecked} zkontrolovaných URL nezaznamenána žádná 404 ani 500
              </p>
            </div>
          )}

          {!errorsLoading && filteredErrors.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-16">Chyba</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">URL</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-32">Poslední crawl</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Stav pokrytí</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredErrors.map((err, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          err.errorType === '404'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {err.errorType}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <a href={err.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all">
                          {err.url}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {err.lastCrawlTime
                          ? new Date(err.lastCrawlTime).toLocaleDateString('cs')
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{err.coverageState || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400">
                Zobrazeno {filteredErrors.length} z {current?.errors.length ?? 0} chyb
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
