import { Fragment } from 'react'
import type { BlockView } from '../api/types'
import { blockRegistry } from './blockRegistry'

export default function PageBlocks({ blocks }: { blocks: BlockView[] }) {
  return (
    <>
      {blocks.map((block) => {
        const render = blockRegistry[block.type]
        if (!render) return null
        return <Fragment key={block.id}>{render(block)}</Fragment>
      })}
    </>
  )
}
