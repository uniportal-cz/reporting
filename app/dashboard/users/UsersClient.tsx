'use client'

import { useState } from 'react'
import type { SafeUser, UserRole } from '@/lib/users'

interface Props {
  initialUsers: SafeUser[]
  currentUserId: string
}

export default function UsersClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  async function reload() {
    const r = await fetch('/api/admin/users')
    if (r.ok) setUsers(await r.json())
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: fd.get('username'),
        password: fd.get('password'),
        role: fd.get('role'),
        email: fd.get('email') || undefined,
      }),
    })
    const data = await r.json()
    if (!r.ok) { setError(data.error); return }
    setShowCreate(false)
    reload()
  }

  async function handleDelete(id: string) {
    if (!confirm('Opravdu smazat tohoto uživatele?')) return
    setError(null)
    const r = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await r.json()
    if (!r.ok) { setError(data.error); return }
    reload()
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const body: Record<string, string> = { id }
    const pw = fd.get('password') as string
    if (pw) body.password = pw
    const role = fd.get('role') as string
    if (role) body.role = role
    const email = fd.get('email') as string
    if (email !== undefined) body.email = email

    const r = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await r.json()
    if (!r.ok) { setError(data.error); return }
    setEditId(null)
    reload()
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{users.length} uživatelů</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
        >
          {showCreate ? 'Zrušit' : '+ Nový uživatel'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-medium text-gray-900">Nový uživatel</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Uživatelské jméno *</label>
              <input name="username" required minLength={2} maxLength={50}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Heslo * (min. 6 znaků)</label>
              <input name="password" type="password" required minLength={6}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Role</label>
              <select name="role" className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">E-mail (volitelné)</label>
              <input name="email" type="email"
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <button type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md">
            Vytvořit
          </button>
        </form>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Uživatel</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Vytvořen</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Google</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) =>
              editId === u.id ? (
                <tr key={u.id} className="bg-blue-50">
                  <td colSpan={6} className="px-4 py-3">
                    <form onSubmit={(e) => handleEdit(e, u.id)} className="flex gap-3 items-end flex-wrap">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Nové heslo</label>
                        <input name="password" type="password" minLength={6} placeholder="nechat beze změny"
                          className="border rounded px-2 py-1.5 text-sm w-48" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Role</label>
                        <select name="role" defaultValue={u.role}
                          className="border rounded px-2 py-1.5 text-sm">
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">E-mail</label>
                        <input name="email" type="email" defaultValue={u.email ?? ''}
                          className="border rounded px-2 py-1.5 text-sm w-48" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit"
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">
                          Uložit
                        </button>
                        <button type="button" onClick={() => setEditId(null)}
                          className="px-3 py-1.5 border text-sm rounded hover:bg-gray-50">
                          Zrušit
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className={u.id === currentUserId ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.id === currentUserId && <span className="ml-2 text-xs text-gray-400">(vy)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('cs')}
                  </td>
                  <td className="px-4 py-3">
                    {(u as SafeUser & { googleTokens?: { email?: string } }).googleTokens ? (
                      <span className="text-xs text-green-600">✓ připojeno</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button onClick={() => setEditId(u.id)}
                      className="text-sm text-blue-600 hover:underline">Upravit</button>
                    {u.id !== currentUserId && (
                      <button onClick={() => handleDelete(u.id)}
                        className="text-sm text-red-600 hover:underline">Smazat</button>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
