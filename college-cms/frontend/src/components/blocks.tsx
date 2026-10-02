import type { BlockView } from '../api/types'
import MediaImage from './MediaImage'
import RichText from './RichText'

export function HeadingBlock({ content }: { content: Extract<BlockView, { type: 'heading' }>['content'] }) {
  const level = Math.min(Math.max(content.level, 2), 6)
  const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return <Tag>{content.text}</Tag>
}

export function TextBlock({ content }: { content: Extract<BlockView, { type: 'paragraph' }>['content'] }) {
  if (content.rich && content.rich.nodes.length > 0) {
    return <RichText doc={content.rich} />
  }
  return <p>{content.text}</p>
}

export function ListBlock({ content }: { content: Extract<BlockView, { type: 'list' }>['content'] }) {
  const items = content.items.filter((item) => item.trim() !== '')
  const ListTag = content.ordered ? 'ol' : 'ul'
  return (
    <ListTag>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ListTag>
  )
}

export function ImageBlock({
  content,
  media,
}: {
  content: Extract<BlockView, { type: 'image' }>['content']
  media: Extract<BlockView, { type: 'image' }>['media']
}) {
  return (
    <figure className="content-image">
      <MediaImage media={media} alt={content.alt} />
      {content.caption && <figcaption>{content.caption}</figcaption>}
    </figure>
  )
}

export function GalleryBlock({
  content,
  items,
}: {
  content: Extract<BlockView, { type: 'gallery' }>['content']
  items: Extract<BlockView, { type: 'gallery' }>['items']
}) {
  if (!items || items.length === 0) return null
  return (
    <figure className="gallery-block">
      <div className="gallery-grid">
        {items.map((item) => (
          <div key={item.id} className="gallery-item">
            <MediaImage media={null} alt={item.caption} />
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </div>
        ))}
      </div>
      {content.caption && <figcaption>{content.caption}</figcaption>}
    </figure>
  )
}
