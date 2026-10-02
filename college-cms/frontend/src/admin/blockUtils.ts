import type { BlockInput, BlockView, PageBlockType } from '../api/types'

export const blockTypeLabels: { value: PageBlockType; label: string }[] = [
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'list', label: 'List' },
  { value: 'image', label: 'Image' },
  { value: 'gallery', label: 'Gallery' },
]

export function blockToInput(block: BlockView): BlockInput {
  if (block.type === 'heading') {
    return {
      type: 'heading',
      content: { text: block.content.text, level: block.content.level },
      published: block.published,
    }
  }
  if (block.type === 'paragraph') {
    return {
      type: 'paragraph',
      content: block.content.rich
        ? { text: block.content.text, rich: block.content.rich }
        : { text: block.content.text },
      published: block.published,
    }
  }
  if (block.type === 'list') {
    return {
      type: 'list',
      content: { ordered: block.content.ordered, items: block.content.items },
      published: block.published,
    }
  }
  if (block.type === 'image') {
    return {
      type: 'image',
      content: { alt: block.content.alt, caption: block.content.caption },
      mediaId: block.mediaId ?? block.media?.id ?? 0,
      published: block.published,
    }
  }
  return {
    type: 'gallery',
    content: { caption: block.content.caption },
    items: block.items.map((item) => ({ mediaId: item.mediaId, caption: item.caption })),
    published: block.published,
  }
}
