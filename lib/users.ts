import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export type UserRole = 'admin' | 'member'

export interface UserRecord {
  id: string
  username: string
  passwordHash: string
  role: UserRole
  email?: string
  createdAt: string
  googleTokens?: {
    accessToken: string
    refreshToken: string
    expiresAt: number
    email?: string
  }
}

export type SafeUser = Omit<UserRecord, 'passwordHash'>

// ─── Storage ─────────────────────────────────────────────────────────────────

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN
const DATA_BASE = process.env.VERCEL === '1' ? '/tmp' : process.cwd()
const BLOB_PATH = 'users/data.json'

async function readRaw(): Promise<UserRecord[] | null> {
  if (USE_BLOB) {
    try {
      const { get } = await import('@vercel/blob')
      const result = await get(BLOB_PATH, { access: 'private' })
      if (!result || !result.stream) return null
      const text = await new Response(result.stream).text()
      return JSON.parse(text) as UserRecord[]
    } catch { return null }
  }
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const filePath = path.join(DATA_BASE, 'data', 'users.json')
  if (!fs.existsSync(filePath)) return null
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) as UserRecord[] } catch { return null }
}

async function writeRaw(users: UserRecord[]): Promise<void> {
  const data = JSON.stringify(users, null, 2)
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob')
    await put(BLOB_PATH, data, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return
  }
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const filePath = path.join(DATA_BASE, 'data', 'users.json')
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, data, 'utf8')
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

let _bootstrapped = false

async function getAllUsers(): Promise<UserRecord[]> {
  const raw = await readRaw()
  if (raw) return raw

  if (_bootstrapped) return []
  _bootstrapped = true

  const hash = await bcrypt.hash('admin', 12)
  const admin: UserRecord = {
    id: randomUUID(),
    username: 'admin',
    passwordHash: hash,
    role: 'admin',
    createdAt: new Date().toISOString(),
  }
  await writeRaw([admin])
  return [admin]
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getUserByUsername(username: string): Promise<UserRecord | null> {
  const users = await getAllUsers()
  return users.find((u) => u.username === username) ?? null
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const users = await getAllUsers()
  return users.find((u) => u.id === id) ?? null
}

export async function listUsers(): Promise<SafeUser[]> {
  const users = await getAllUsers()
  return users.map(({ passwordHash: _, ...u }) => u)
}

export async function createUser(
  username: string,
  password: string,
  role: UserRole = 'member',
  email?: string,
): Promise<SafeUser> {
  const users = await getAllUsers()
  if (users.some((u) => u.username === username)) {
    throw new Error('Uživatel s tímto jménem již existuje')
  }
  if (username.length < 2 || username.length > 50) {
    throw new Error('Uživatelské jméno musí mít 2–50 znaků')
  }
  if (password.length < 6) {
    throw new Error('Heslo musí mít alespoň 6 znaků')
  }
  const hash = await bcrypt.hash(password, 12)
  const user: UserRecord = {
    id: randomUUID(),
    username: username.trim(),
    passwordHash: hash,
    role,
    createdAt: new Date().toISOString(),
    ...(email ? { email } : {}),
  }
  users.push(user)
  await writeRaw(users)
  const { passwordHash: _, ...safe } = user
  return safe
}

export async function updateUser(
  id: string,
  updates: { username?: string; password?: string; role?: UserRole; email?: string },
): Promise<void> {
  const users = await getAllUsers()
  const idx = users.findIndex((u) => u.id === id)
  if (idx < 0) throw new Error('Uživatel nenalezen')

  if (updates.username !== undefined && updates.username !== users[idx].username) {
    if (users.some((u) => u.username === updates.username)) {
      throw new Error('Uživatel s tímto jménem již existuje')
    }
    users[idx].username = updates.username.trim()
  }
  if (updates.password) {
    if (updates.password.length < 6) throw new Error('Heslo musí mít alespoň 6 znaků')
    users[idx].passwordHash = await bcrypt.hash(updates.password, 12)
  }
  if (updates.role) {
    const adminCount = users.filter((u) => u.role === 'admin').length
    if (users[idx].role === 'admin' && updates.role !== 'admin' && adminCount <= 1) {
      throw new Error('Nelze odebrat oprávnění poslednímu adminovi')
    }
    users[idx].role = updates.role
  }
  if (updates.email !== undefined) users[idx].email = updates.email || undefined

  await writeRaw(users)
}

export async function deleteUser(id: string): Promise<void> {
  const users = await getAllUsers()
  const target = users.find((u) => u.id === id)
  if (!target) throw new Error('Uživatel nenalezen')

  const adminCount = users.filter((u) => u.role === 'admin').length
  if (target.role === 'admin' && adminCount <= 1) {
    throw new Error('Nelze smazat posledního admina')
  }
  await writeRaw(users.filter((u) => u.id !== id))
}

export async function saveGoogleTokens(
  userId: string,
  tokens: NonNullable<UserRecord['googleTokens']>,
): Promise<void> {
  const users = await getAllUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) throw new Error('Uživatel nenalezen')
  users[idx].googleTokens = tokens
  await writeRaw(users)
}

export async function getGoogleTokens(
  userId: string,
): Promise<UserRecord['googleTokens'] | null> {
  const user = await getUserById(userId)
  return user?.googleTokens ?? null
}
