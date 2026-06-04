import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ error: 'This endpoint is no longer available' }, { status: 410 })
}
