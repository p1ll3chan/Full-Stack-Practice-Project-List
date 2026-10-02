import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { Media } from '../api/types'
import MediaImage from '../components/MediaImage'
import { EmptyState, ErrorState, Loading } from '../components/states'
import Pagination from '../components/Pagination'
import { qs, useDebounced } from './api'
import { ConfirmButton, FormField, SaveStatus } from './form'
import { mediaCreateSchema, mediaUpdateSchema } from './schemas'

const statuses = ['referenced', 'ready', 'missing'] as const

export default function MediaManager() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const debouncedSearch = useDebounced(search)
  const params = {
    q: debouncedSearch || undefined,
    status: status || undefined,
    page,
    limit: 10,
    sort: 'createdAt',
    order: 'desc' as const,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.media.of(params),
    queryFn: () => api.list<Media>(`/admin/media${qs(params)}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.media.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.pages.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
  }

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/media/${id}`),
    onSuccess: invalidate,
    onError: (mutationError: Error) => window.alert(mutationError.message),
  })

  if (isLoading) return <Loading label="Loading media…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const rows = data?.data ?? []

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Media</h1>
      </div>

      <CreateMediaForm onCreated={invalidate} />

      <div className="filter-bar">
        <label>
          Search
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="file name, URL or alt text"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Any</option>
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          message="No media yet."
          hint="Add an image URL above — file uploads are not configured, so images are referenced by URL."
        />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>URL</th>
              <th>Alt text</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="media-thumb">
                  <MediaImage media={{ url: row.url, altText: row.altText }} alt={row.altText} />
                </td>
                <td className="media-url-cell">
                  <span title={row.url ?? ''}>{row.url ?? '—'}</span>
                </td>
                <td>{row.altText || '—'}</td>
                <td>
                  <span
                    className={`badge ${row.status === 'ready' ? 'badge-live' : 'badge-draft'}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="table-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setEditingId(editingId === row.id ? null : row.id)}
                  >
                    {editingId === row.id ? 'Close' : 'Edit'}
                  </button>
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Confirm delete"
                    disabled={remove.isPending}
                    onConfirm={() => remove.mutate(row.id)}
                  />
                </td>
              </tr>
            ))}
            {rows.map((row) =>
              editingId === row.id ? (
                <tr key={`${row.id}-edit`} className="table-expand-row">
                  <td colSpan={5}>
                    <EditMediaForm
                      media={row}
                      onSaved={() => {
                        setEditingId(null)
                        invalidate()
                      }}
                    />
                  </td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      )}

      {remove.isError && (
        <p className="field-error" role="alert">
          {remove.error instanceof ApiError && remove.error.status === 403
            ? 'Only an admin token can delete media.'
            : remove.error?.message}
        </p>
      )}

      <Pagination meta={data?.meta ?? null} onPageChange={setPage} />
    </section>
  )
}

function CreateMediaForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [fileName, setFileName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: (body: { url: string; altText: string; fileName: string | null }) =>
      api.post<Media>('/admin/media', body),
    onSuccess: () => {
      setUrl('')
      setAltText('')
      setFileName('')
      setErrors({})
      setStatus('saved')
      setMessage('Media added.')
      setSaveError(null)
      onCreated()
    },
    onError: (mutationError: Error) => {
      setStatus('error')
      setSaveError(mutationError.message)
    },
  })

  const submit = () => {
    const parsed = mediaCreateSchema.safeParse({
      url,
      altText,
      fileName: fileName === '' ? null : fileName,
      status: 'ready',
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_form'
        if (!(key in next)) next[key] = issue.message
      }
      setErrors(next)
      setStatus('error')
      setMessage('Fix the highlighted fields.')
      return
    }
    setErrors({})
    setMessage(null)
    setStatus('saving')
    create.mutate({ url: parsed.data.url, altText: parsed.data.altText, fileName: parsed.data.fileName })
  }

  if (!open) {
    return (
      <div className="editor-actions">
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          Add media
        </button>
      </div>
    )
  }

  return (
    <div className="admin-card">
      <h2>Add media by URL</h2>
      <p className="field-hint">
        No file upload backend is configured — paste a public image URL (https://…) or a site path (/images/…).
      </p>
      <FormField label="Image URL" error={errors.url}>
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />
      </FormField>
      <div className="form-grid">
        <FormField label="File name" hint="optional label" error={errors.fileName}>
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
        </FormField>
        <FormField label="Alt text" error={errors.altText}>
          <input value={altText} onChange={(event) => setAltText(event.target.value)} />
        </FormField>
      </div>
      <SaveStatus status={status} message={saveError ?? message} />
      <div className="editor-actions">
        <button type="button" className="btn-primary" disabled={create.isPending} onClick={submit}>
          {create.isPending ? 'Adding…' : 'Add media'}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  )
}

function EditMediaForm({ media, onSaved }: { media: Media; onSaved: () => void }) {
  const [url, setUrl] = useState(media.url ?? '')
  const [altText, setAltText] = useState(media.altText)
  const [fileName, setFileName] = useState(media.fileName ?? '')
  const [mediaStatus, setMediaStatus] = useState<(typeof statuses)[number]>(media.status)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const update = useMutation({
    mutationFn: (body: {
      url?: string | null
      fileName?: string | null
      altText?: string
      status?: (typeof statuses)[number]
    }) => api.put<Media>(`/admin/media/${media.id}`, body),
    onSuccess: () => {
      setSaveStatus('saved')
      setMessage('Saved.')
      onSaved()
    },
    onError: (mutationError: Error) => {
      setSaveStatus('error')
      setMessage(mutationError.message)
    },
  })

  const submit = () => {
    const parsed = mediaUpdateSchema.safeParse({
      url: url === '' ? null : url,
      fileName: fileName === '' ? null : fileName,
      altText,
      status: mediaStatus,
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_form'
        if (!(key in next)) next[key] = issue.message
      }
      setErrors(next)
      setSaveStatus('error')
      setMessage('Fix the highlighted fields.')
      return
    }
    setErrors({})
    setSaveStatus('saving')
    setMessage(null)
    update.mutate(parsed.data)
  }

  return (
    <div className="media-edit-form">
      <FormField label="Image URL" error={errors.url}>
        <input value={url} onChange={(event) => setUrl(event.target.value)} />
      </FormField>
      <div className="form-grid">
        <FormField label="File name" error={errors.fileName}>
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
        </FormField>
        <FormField label="Status" error={errors.status}>
          <select
            value={mediaStatus}
            onChange={(event) => setMediaStatus(event.target.value as (typeof statuses)[number])}
          >
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Alt text" error={errors.altText}>
        <input value={altText} onChange={(event) => setAltText(event.target.value)} />
      </FormField>
      <SaveStatus status={saveStatus} message={message} />
      <div className="editor-actions">
        <button type="button" className="btn-primary" disabled={update.isPending} onClick={submit}>
          {update.isPending ? 'Saving…' : 'Save media'}
        </button>
        <button type="button" className="btn" onClick={onSaved}>
          Cancel
        </button>
      </div>
    </div>
  )
}
