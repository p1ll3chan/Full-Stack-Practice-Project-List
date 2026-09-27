import type { ContentBlockData } from '../api/types'

export default function ContentBlock({ block }: { block: ContentBlockData }) {
  switch (block.type) {
    case 'heading':
      return <h2>{block.content}</h2>
    case 'paragraph':
      return <p>{block.content}</p>
    case 'image':
      return <img src={block.content} alt="" className="content-image" />
    case 'list':
      return (
        <ul>
          {block.content.split('\n').filter(Boolean).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    default:
      return null
  }
}
