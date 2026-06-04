import { NextResponse } from 'next/server'
import { fetchEmailByUidPublic } from '@/lib/imap'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  const url = new URL(req.url)
  const uid = parseInt(url.searchParams.get('uid') || '')
  if (isNaN(uid)) {
    return NextResponse.json({ error: 'Missing ?uid=NUMBER' }, { status: 400 })
  }

  const fetched = await fetchEmailByUidPublic(uid)
  if (!fetched) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  const $ = cheerio.load(fetched.html)

  // Collect all headings
  const headings: { tag: string; text: string }[] = []
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    headings.push({ tag: el.tagName, text: $(el).text().trim().slice(0, 120) })
  })

  // Collect strong/bold candidates that might be section headers
  const bolds: string[] = []
  $('strong, b, td[colspan], th').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 3 && t.length < 150 && /\d/.test(t)) bolds.push(t.slice(0, 120))
  })

  // Table count
  const tableCount = $('table').length

  // First 3000 chars of HTML for structure inspection
  const htmlSnippet = fetched.html.slice(0, 3000)

  return NextResponse.json({
    subject: fetched.subject,
    date: fetched.date,
    htmlLength: fetched.html.length,
    tableCount,
    headings,
    boldCandidates: bolds.slice(0, 30),
    htmlSnippet,
  })
}
