import type { CSSProperties } from 'react'
import type { RichDoc, RichNode, RichTextRun } from '../api/types'
import { guardedTextColor } from './richTextColor'

function safeHref(href: string): string | null {
  const value = href.trim()
  if (/^(https?:)?\/\//i.test(value)) return value
  if (/^(mailto|tel):/i.test(value)) return value
  if (value.startsWith('/')) return value
  return null
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
  const color = guardedTextColor(run.foreground)
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
    <div className={['rich-text', 'prose', className].filter(Boolean).join(' ')}>
      {doc.nodes.map((node, index) => (
        <Node key={index} node={node} />
      ))}
    </div>
  )
}
