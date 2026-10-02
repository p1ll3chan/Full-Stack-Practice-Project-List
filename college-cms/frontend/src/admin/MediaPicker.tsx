import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { Media } from '../api/types'
import MediaImage from '../components/MediaImage'
import { qs } from './api'
import { FormField } from './form'
import { mediaCreateSchema } from './schemas'

interface MediaPickerProps {
  value: number | null
  onChange: (id: number | null) => void
  label?: string
  hint?: string
}

export default function MediaPicker({ value, onChange, label = 'Image', hint }: MediaPickerProps) {
  const queryClient = useQueryClient()
  const { data: mediaList, isLoading } = useQuery({
    queryKey: adminKeys.media.of({ limit: 100 }),
    queryFn: () => api.list<Media>(`/admin/media${qs({ limit: 100, sort: 'createdAt', order: 'desc' })}`),
  })
  const [adding, setAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newAlt, setNewAlt] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const createMedia = useMutation({
    mutationFn: (body: { url: string; altText: string }) => api.post<Media>('/admin/media', body),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.media.root })
      setNewUrl('')
      setNewAlt('')
      setAddError(null)
      setAdding(false)
      onChange(created.id)
    },
    onError: (error: Error) => setAddError(error.message),
  })

  const items = mediaList?.data ?? []
  const selected = items.find((item) => item.id === value) ?? null

  const submitNewUrl = () => {
    const parsed = mediaCreateSchema.safeParse({ url: newUrl, altText: newAlt, fileName: null, status: 'ready' })
    if (!parsed.success) {
      setAddError(parsed.error.issues[0]?.message ?? 'Invalid image URL.')
      return
    }
    setAddError(null)
    createMedia.mutate({ url: parsed.data.url, altText: parsed.data.altText })
  }

  return (
    <div className="media-picker">
      <FormField label={label} hint={hint ?? 'Choose from the media library or add an image URL.'}>
        <select
          value={value === null ? '' : String(value)}
          onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
          disabled={isLoading}
        >
          <option value="">{isLoading ? 'Loading media…' : 'No image'}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fileName || item.url || `#${item.id}`} — {item.altText || 'no alt text'}
            </option>
          ))}
        </select>
      </FormField>
      {selected && (
        <div className="media-picker-preview">
          <MediaImage media={{ url: selected.url, altText: selected.altText }} alt={selected.altText} />
          <span>{selected.url ?? 'no URL'}</span>
        </div>
      )}
      {!adding ? (
        <button type="button" className="btn" onClick={() => setAdding(true)}>
          Add image URL
        </button>
      ) : (
        <div className="media-add-form">
          <FormField label="Image URL" error={addError ?? undefined}>
            <input
              value={newUrl}
              onChange={(event) => setNewUrl(event.target.value)}
              placeholder="https://… or /images/photo.jpg"
            />
          </FormField>
          <FormField label="Alt text">
            <input value={newAlt} onChange={(event) => setNewAlt(event.target.value)} />
          </FormField>
          <div className="editor-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={submitNewUrl}
              disabled={createMedia.isPending}
            >
              {createMedia.isPending ? 'Adding…' : 'Add'}
            </button>
            <button type="button" className="btn" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
          <p className="field-hint">
            File uploads are not configured — register an existing public URL (http(s) or a site path like
            /images/photo.jpg).
          </p>
        </div>
      )}
    </div>
  )
}
