import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { BlockInput, BlockView, Media, PageBlockType } from '../api/types'
import MediaImage from '../components/MediaImage'
import { qs } from './api'
import MediaPicker from './MediaPicker'
import { FormField } from './form'
import { blockSchema, issuesToErrors } from './schemas'

interface GalleryDraftItem {
  mediaId: number
  caption: string
}

interface BlockDraft {
  text: string
  level: number
  ordered: boolean
  items: string
  alt: string
  caption: string
  mediaId: number | null
  galleryItems: GalleryDraftItem[]
  published: boolean
}

function emptyDraft(published = true): BlockDraft {
  return {
    text: '',
    level: 2,
    ordered: false,
    items: '',
    alt: '',
    caption: '',
    mediaId: null,
    galleryItems: [],
    published,
  }
}

function draftFromBlock(block: BlockView): BlockDraft {
  const draft = emptyDraft(block.published)
  if (block.type === 'heading') {
    draft.text = block.content.text
    draft.level = block.content.level
  } else if (block.type === 'paragraph') {
    draft.text = block.content.text
  } else if (block.type === 'list') {
    draft.ordered = block.content.ordered
    draft.items = block.content.items.join('\n')
  } else if (block.type === 'image') {
    draft.alt = block.content.alt
    draft.caption = block.content.caption
    draft.mediaId = block.mediaId ?? block.media?.id ?? null
  } else if (block.type === 'gallery') {
    draft.caption = block.content.caption
    draft.galleryItems = block.items.map((item) => ({ mediaId: item.mediaId, caption: item.caption }))
  }
  return draft
}

function draftToInput(type: PageBlockType, draft: BlockDraft): unknown {
  const published = draft.published
  if (type === 'heading') return { type, content: { text: draft.text, level: draft.level }, published }
  if (type === 'paragraph') return { type, content: { text: draft.text }, published }
  if (type === 'list') {
    return {
      type,
      content: {
        ordered: draft.ordered,
        items: draft.items
          .split('\n')
          .map((item) => item.trim())
          .filter((item) => item !== ''),
      },
      published,
    }
  }
  if (type === 'image') {
    return {
      type,
      content: { alt: draft.alt, caption: draft.caption },
      mediaId: draft.mediaId ?? 0,
      published,
    }
  }
  return {
    type,
    content: { caption: draft.caption },
    items: draft.galleryItems.map((item) => ({ mediaId: item.mediaId, caption: item.caption })),
    published,
  }
}

interface BlockFormProps {
  type: PageBlockType
  existing?: BlockView
  onSave: (input: BlockInput) => Promise<void>
  onCancel: () => void
}

export default function BlockForm({ type, existing, onSave, onCancel }: BlockFormProps) {
  const [draft, setDraft] = useState<BlockDraft>(existing ? draftFromBlock(existing) : emptyDraft())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = <K extends keyof BlockDraft>(key: K, value: BlockDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!(String(key) in current)) return current
      const next = { ...current }
      delete next[String(key)]
      return next
    })
  }

  const submit = async () => {
    const parsed = blockSchema.safeParse(draftToInput(type, draft))
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error))
      setFormError('Fix the highlighted fields before saving.')
      return
    }
    setErrors({})
    setFormError(null)
    setSaving(true)
    try {
      await onSave(parsed.data as BlockInput)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Saving failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="block-form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className="block-form-type">{type} block</p>

      {(type === 'heading' || type === 'paragraph') && (
        <FormField
          label={type === 'heading' ? 'Heading text' : 'Paragraph text'}
          error={errors['content.text']}
        >
          {type === 'heading' ? (
            <input value={draft.text} onChange={(event) => set('text', event.target.value)} />
          ) : (
            <textarea rows={6} value={draft.text} onChange={(event) => set('text', event.target.value)} />
          )}
        </FormField>
      )}

      {type === 'heading' && (
        <FormField label="Level" error={errors['content.level']}>
          <select value={String(draft.level)} onChange={(event) => set('level', Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                H{level}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {type === 'list' && (
        <>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.ordered}
              onChange={(event) => set('ordered', event.target.checked)}
            />
            Numbered list
          </label>
          <FormField label="Items (one per line)" error={errors['content.items']}>
            <textarea rows={6} value={draft.items} onChange={(event) => set('items', event.target.value)} />
          </FormField>
        </>
      )}

      {type === 'image' && (
        <>
          <MediaPicker
            value={draft.mediaId}
            onChange={(id) => set('mediaId', id)}
            label="Image"
            hint="Image blocks require a media item."
          />
          {errors.mediaId && (
            <p className="field-error" role="alert">
              {errors.mediaId}
            </p>
          )}
          <FormField label="Alt text" error={errors['content.alt']}>
            <input value={draft.alt} onChange={(event) => set('alt', event.target.value)} />
          </FormField>
          <FormField label="Caption" error={errors['content.caption']}>
            <input value={draft.caption} onChange={(event) => set('caption', event.target.value)} />
          </FormField>
        </>
      )}

      {type === 'gallery' && (
        <>
          <FormField label="Gallery caption" error={errors['content.caption']}>
            <input value={draft.caption} onChange={(event) => set('caption', event.target.value)} />
          </FormField>
          <GalleryItemsEditor items={draft.galleryItems} onChange={(items) => set('galleryItems', items)} />
        </>
      )}

      <label className="checkbox">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(event) => set('published', event.target.checked)}
        />
        Visible to visitors (published)
      </label>

      {formError && (
        <p className="field-error" role="alert">
          {formError}
        </p>
      )}

      <div className="editor-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save block' : 'Add block'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function GalleryItemsEditor({
  items,
  onChange,
}: {
  items: GalleryDraftItem[]
  onChange: (items: GalleryDraftItem[]) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.media.of({ limit: 100 }),
    queryFn: () => api.list<Media>(`/admin/media${qs({ limit: 100, sort: 'createdAt', order: 'desc' })}`),
  })
  const options = data?.data ?? []
  const selectedIds = new Set(items.map((item) => item.mediaId))

  const toggle = (mediaId: number, checked: boolean) => {
    if (checked) onChange([...items, { mediaId, caption: '' }])
    else onChange(items.filter((item) => item.mediaId !== mediaId))
  }

  if (isLoading) return <p className="field-hint">Loading media…</p>
  if (options.length === 0) {
    return <p className="field-hint">Add images in the Media library first, then pick them here.</p>
  }

  return (
    <div className="gallery-picker">
      <span className="field-label">Images</span>
      <ul className="gallery-picker-list">
        {options.map((option) => (
          <li key={option.id}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={selectedIds.has(option.id)}
                onChange={(event) => toggle(option.id, event.target.checked)}
              />
              <MediaImage media={{ url: option.url, altText: option.altText }} alt={option.altText} />
              {option.fileName || option.url || `#${option.id}`}
            </label>
            {selectedIds.has(option.id) && (
              <input
                className="gallery-caption-input"
                placeholder="Caption"
                value={items.find((item) => item.mediaId === option.id)?.caption ?? ''}
                onChange={(event) => {
                  const caption = event.target.value
                  onChange(items.map((item) => (item.mediaId === option.id ? { ...item, caption } : item)))
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
