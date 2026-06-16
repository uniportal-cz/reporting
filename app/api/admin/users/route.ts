import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { listUsers, createUser, updateUser, deleteUser } from '@/lib/users'

export const runtime = 'nodejs'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

// GET /api/admin/users — list all users
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Přístup zamítnut' }, { status: 403 })
  }
  const users = await listUsers()
  return NextResponse.json(users)
}

const createSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(200),
  role: z.enum(['admin', 'member']).default('member'),
  email: z.string().email().optional(),
})

// POST /api/admin/users — create user
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Přístup zamítnut' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Neplatná data', details: parsed.error.issues }, { status: 400 })
  }
  try {
    const user = await createUser(parsed.data.username, parsed.data.password, parsed.data.role, parsed.data.email)
    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 })
  }
}

const updateSchema = z.object({
  id: z.string(),
  username: z.string().min(2).max(50).optional(),
  password: z.string().min(6).max(200).optional(),
  role: z.enum(['admin', 'member']).optional(),
  email: z.string().email().optional().or(z.literal('')),
})

// PATCH /api/admin/users — update user
export async function PATCH(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Přístup zamítnut' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Neplatná data', details: parsed.error.issues }, { status: 400 })
  }
  const { id, ...updates } = parsed.data
  try {
    await updateUser(id, updates)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

const deleteSchema = z.object({ id: z.string() })

// DELETE /api/admin/users — delete user
export async function DELETE(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Přístup zamítnut' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Chybí ID uživatele' }, { status: 400 })
  }
  try {
    await deleteUser(parsed.data.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
