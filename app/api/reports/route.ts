import { NextResponse } from 'next/server'
import { loadIndex } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const index = loadIndex()
    return NextResponse.json(index)
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: 'Failed to load index' }, { status: 500 })
  }
}
