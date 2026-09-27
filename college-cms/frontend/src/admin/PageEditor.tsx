import { useState } from 'react'
import { api } from '../api/client'
import type { ContentBlockData, Page } from '../api/types'

const emptyBlock = (): ContentBlockData => ({
  id: crypto.randomUUID(),
  type: 'paragraph',
  content: '',
})

export default function PageEditor({ page }: { page?: Page }) {
  const [title, setTitle] = useState(page?.title ?? '')
  const [slug, setSlug] = useState(page?.slug ?? '')
  const [published, setPublished] = useState(page?.published ?? false)
  const [blocks, setBlocks] = useState<ContentBlockData[]>(page?.blocks ?? [emptyBlock()])
  const [status, setStatus] = useState<string | null>(null)

  const updateBlock = (id: string, patch: Partial<ContentBlockData>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const save = async () => {
    setStatus('Saving...')
    try {
      const payload = { title, slug, published, blocks }
      if (page) {
        await api.put<Page>(`/pages/${page.id}`, payload)
      } else {
        await api.post<Page>('/pages', payload)
      }
      setStatus('Saved.')
    } catch (err) {
      setStatus(`Save failed: ${(err as Error).message}`)
    }
  }

  return (
    <section>
      <h1>{page ? 'Edit Page' : 'New Page'}</h1>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Slug
        <input value={slug} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published
      </label>

      <h2>Content Blocks</h2>
      {blocks.map((block) => (
        <div key={block.id} className="block-editor">
          <select
            value={block.type}
            onChange={(e) => updateBlock(block.id, { type: e.target.value as ContentBlockData['type'] })}
          >
            <option value="heading">Heading</option>
            <option value="paragraph">Paragraph</option>
            <option value="image">Image URL</option>
            <option value="list">List (one item per line)</option>
          </select>
          <textarea
            rows={block.type === 'list' ? 4 : 2}
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          />
          <button
            type="button"
            className="btn-danger"
            onClick={() => setBlocks((bs) => bs.filter((b) => b.id !== block.id))}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => setBlocks((bs) => [...bs, emptyBlock()])}>
        Add Block
      </button>

      <div className="editor-actions">
        <button type="button" className="btn-primary" onClick={save}>
          Save Page
        </button>
        {status && <span className="editor-status">{status}</span>}
      </div>
    </section>
  )
}
