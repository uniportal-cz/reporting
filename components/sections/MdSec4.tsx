'use client'

import { MdSec4 as MdSec4Type } from '@/types/report'
import MdmWorkflowBlock from './MdmWorkflowBlock'

interface Props { data: MdSec4Type; date: string }

export default function MdSec4({ data }: Props) {
  return <MdmWorkflowBlock data={data} highlightColor="blue" />
}
