import type { ReactNode } from 'react'
import type { BlockView, PageBlockType } from '../api/types'
import { GalleryBlock, HeadingBlock, ImageBlock, ListBlock, TextBlock } from './blocks'

export type BlockRenderer = (block: BlockView) => ReactNode

export const blockRegistry: Record<PageBlockType, BlockRenderer> = {
  heading: (block) => (block.type === 'heading' ? <HeadingBlock content={block.content} /> : null),
  paragraph: (block) => (block.type === 'paragraph' ? <TextBlock content={block.content} /> : null),
  list: (block) => (block.type === 'list' ? <ListBlock content={block.content} /> : null),
  image: (block) => (block.type === 'image' ? <ImageBlock content={block.content} media={block.media} /> : null),
  gallery: (block) =>
    block.type === 'gallery' ? <GalleryBlock content={block.content} items={block.items} /> : null,
}
