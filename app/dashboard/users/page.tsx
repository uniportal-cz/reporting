import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listUsers } from '@/lib/users'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/dashboard')

  const users = await listUsers()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <a href="/dashboard" className="text-blue-600 hover:underline text-sm">← Dashboard</a>
        <h1 className="text-lg font-semibold text-gray-900">Správa uživatelů</h1>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <UsersClient initialUsers={users} currentUserId={session.user.id} />
      </main>
    </div>
  )
}
