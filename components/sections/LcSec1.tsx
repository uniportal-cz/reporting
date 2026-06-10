'use client'

import { LcSec1 as LcSec1Type } from '@/types/report'
import MdmWorkflowBlock from './MdmWorkflowBlock'

interface Props { data: LcSec1Type; date: string }

export default function LcSec1({ data }: Props) {
  return <MdmWorkflowBlock data={data} highlightColor="yellow" />
}
