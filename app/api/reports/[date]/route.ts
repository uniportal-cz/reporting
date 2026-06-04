import { NextResponse } from 'next/server'
import { loadReport } from '@/lib/storage'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { date: string } }
) {
  const { date } = params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }
  const report = await loadReport(date)
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }
  return NextResponse.json(report)
}
