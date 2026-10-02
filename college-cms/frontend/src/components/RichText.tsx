import type { CSSProperties } from 'react'
import type { RichDoc, RichNode, RichTextRun } from '../api/types'

function safeHref(href: string): string | null {
  const value = href.trim()
  if (/^(https?:)?\/\//i.test(value)) return value
  if (/^(mailto|tel):/i.test(value)) return value
  if (value.startsWith('/')) return value
  return null
}

function safeColor(value: string | undefined): string | undefined {
  if (!value) return undefined
  const v = value.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v
  if (/^[a-zA-Z]{3,20}$/.test(v)) return v
  return undefined
}

function alignStyle(align: string): CSSProperties {
  if (align === 'left' || align === 'center' || align === 'right' || align === 'justify') {
    return { textAlign: align }
  }
  return {}
}

function Run({ run }: { run: RichTextRun }) {
  let node = <>{run.text}</>
  if (run.bold) node = <strong>{node}</strong>
  if (run.underline) node = <u>{node}</u>
  const href = run.href ? safeHref(run.href) : null
  if (href) {
    const external = /^https?:\/\//i.test(href)
    node = (
      <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
        {node}
      </a>
    )
  }
  const color = safeColor(run.foreground)
  if (color) {
    return <span style={{ color }}>{node}</span>
  }
  return <>{node}</>
}

function Runs({ runs }: { runs: RichTextRun[] }) {
  return (
    <>
      {runs.map((run, index) => (
        <Run key={index} run={run} />
      ))}
    </>
  )
}

function Node({ node }: { node: RichNode }) {
  if (node.type === 'heading') {
    const level = Math.min(Math.max(node.level, 2), 6)
    const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    return (
      <Tag style={alignStyle(node.align)}>
        <Runs runs={node.runs} />
      </Tag>
    )
  }
  if (node.type === 'list') {
    const ListTag = node.ordered ? 'ol' : 'ul'
    return (
      <ListTag>
        {node.items.map((item, index) => (
          <li key={index}>
            <Runs runs={item} />
          </li>
        ))}
      </ListTag>
    )
  }
  return (
    <p style={alignStyle(node.align)}>
      <Runs runs={node.runs} />
    </p>
  )
}

export default function RichText({ doc, className }: { doc: RichDoc | null | undefined; className?: string }) {
  if (!doc || doc.nodes.length === 0) return null
  return (
    <div className={['rich-text', className].filter(Boolean).join(' ')}>
      {doc.nodes.map((node, index) => (
        <Node key={index} node={node} />
      ))}
    </div>
  )
}
