'use client'

// Block 4 (Zásoby přes limit) has the same structure as Section10 (autoobjednání)
import { UcSec4 as UcSec4Type } from '@/types/report'
import Section10Component from './Section10'
import type { Section10 } from '@/types/report'

interface Props { data: UcSec4Type; date: string }

export default function UcSec4({ data, date }: Props) {
  return <Section10Component data={data as Section10} date={date} reportDate={date} />
}
