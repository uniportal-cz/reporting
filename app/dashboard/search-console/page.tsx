import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGoogleTokens } from '@/lib/users'
import SearchConsoleClient from '@/components/SearchConsoleClient'

export const dynamic = 'force-dynamic'

export default async function SearchConsolePage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const tokens = await getGoogleTokens(session.user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <a href="/dashboard" className="text-blue-600 hover:underline text-sm">← Dashboard</a>
        <h1 className="text-lg font-semibold text-gray-900">Google Search Console — chyby 404 & 500</h1>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <SearchConsoleClient
          hasGoogleTokens={!!tokens}
          googleEmail={tokens?.email}
        />
      </main>
    </div>
  )
}
