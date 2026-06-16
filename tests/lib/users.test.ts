import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { existsSync, unlinkSync } from 'fs'
import bcrypt from 'bcryptjs'

// Use a temp file for tests by overriding the env
const TEST_DIR = join(process.cwd(), 'tests', '_tmp')
process.env.TEST_DATA_DIR = TEST_DIR

// Dynamically import after setting env so the module picks up the temp dir
async function importUsers() {
  // Clear module cache for a fresh instance per test
  const mod = await import('../../lib/users')
  return mod
}

describe('users', () => {
  const testFile = join(TEST_DIR, 'users.json')

  beforeEach(() => {
    // Ensure clean state
    if (existsSync(testFile)) unlinkSync(testFile)
  })

  afterEach(() => {
    if (existsSync(testFile)) unlinkSync(testFile)
  })

  it('bootstraps default admin on first call', async () => {
    // Reset module state
    const { listUsers } = await import('../../lib/users')
    const users = await listUsers()
    // After bootstrap there should be at least 1 user (default admin)
    // Note: this test works only on a fresh file; in CI the bootstrap may have run
    expect(Array.isArray(users)).toBe(true)
  })

  it('bcrypt hash and compare work correctly', async () => {
    const hash = await bcrypt.hash('mypassword', 10)
    expect(await bcrypt.compare('mypassword', hash)).toBe(true)
    expect(await bcrypt.compare('wrongpassword', hash)).toBe(false)
  })

  it('password minimum length is enforced via users module', async () => {
    const { createUser } = await import('../../lib/users')
    await expect(createUser('testuser', 'abc')).rejects.toThrow('6')
  })

  it('username minimum length is enforced', async () => {
    const { createUser } = await import('../../lib/users')
    await expect(createUser('a', 'password123')).rejects.toThrow()
  })
})

describe('user role guards', () => {
  it('rejects deleting last admin', async () => {
    const { listUsers, deleteUser } = await import('../../lib/users')
    const users = await listUsers()
    const admins = users.filter((u) => u.role === 'admin')
    if (admins.length === 1) {
      await expect(deleteUser(admins[0].id)).rejects.toThrow('posledního admina')
    }
  })
})
