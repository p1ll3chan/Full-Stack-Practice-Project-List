import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { z } from 'zod'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { BlockInput, BlockView, PageSection, PageWithBlocks } from '../api/types'
import PageBlocks from '../components/PageBlocks'
import { ErrorState, Loading } from '../components/states'
import BlockForm from './BlockForm'
import { blockToInput, blockTypeLabels } from './blockUtils'
import { ConfirmButton, FormField, SaveStatus } from './form'
import { useForm } from './useForm'
import { pageCreateSchema, pageUpdateSchema } from './schemas'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function PageEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const pageId = id === undefined ? null : Number(id)
  const createMode = pageId === null || Number.isNaN(pageId)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.page(pageId ?? -1),
    queryFn: () => api.get<PageWithBlocks>(`/admin/pages/${pageId}`),
    enabled: !createMode,
  })

  if (createMode) return <CreatePageForm />
  if (isLoading) return <Loading label="Loading page…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Page not loaded.')} onRetry={refetch} />

  return <PageEditView page={data} invalidate={() => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.page(pageId as number) })
    void queryClient.invalidateQueries({ queryKey: adminKeys.pages.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
  }} />
}

function CreatePageForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const prefillSection = searchParams.get('section')
  const prefillTitle = searchParams.get('title') ?? ''
  const form = useForm<{
    title: string
    slug: string
    section: PageSection
    published: boolean
  }>({
    initial: {
      title: prefillTitle,
      slug: slugify(prefillTitle),
      section: (['general', 'about', 'contact', 'academics', 'excellence', 'faculty'].includes(
        prefillSection ?? '',
      )
        ? (prefillSection as PageSection)
        : 'general'),
      published: false,
    },
    schema: pageCreateSchema as unknown as z.ZodType<{
      title: string
      slug: string
      section: PageSection
      published: boolean
    }>,
    onSubmit: async (values) => {
      const created = await api.post<PageWithBlocks>('/admin/pages', { ...values, blocks: [] })
      void queryClient.invalidateQueries({ queryKey: adminKeys.pages.root })
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
      navigate(`/admin/pages/${created.id}`, { replace: true })
    },
  })

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>New page</h1>
        <Link to="/admin/pages" className="btn">
          Back to pages
        </Link>
      </div>
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField label="Title" error={form.errors.title}>
          <input
            value={form.values.title}
            onChange={(event) => {
              const title = event.target.value
              form.setField('title', title)
              if (form.values.slug === '') form.setField('slug', slugify(title))
            }}
          />
        </FormField>
        <FormField label="Slug" hint="URL path, e.g. admission-2026" error={form.errors.slug}>
          <div className="input-with-action">
            <input value={form.values.slug} onChange={(event) => form.setField('slug', event.target.value)} />
            <button
              type="button"
              className="btn"
              onClick={() => form.setField('slug', slugify(form.values.title))}
            >
              From title
            </button>
          </div>
        </FormField>
        <FormField label="Section" error={form.errors.section}>
          <select
            value={form.values.section}
            onChange={(event) => form.setField('section', event.target.value as PageSection)}
          >
            {['general', 'about', 'contact', 'academics', 'excellence', 'faculty'].map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </FormField>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.values.published}
            onChange={(event) => form.setField('published', event.target.checked)}
          />
          Publish immediately
        </label>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Creating…' : 'Create page'}
          </button>
        </div>
      </form>
    </section>
  )
}

function PageEditView({
  page,
  invalidate,
}: {
  page: PageWithBlocks
  invalidate: () => void
}) {
  const metaForm = useForm<{ title: string; slug: string; section: PageSection }>({
    initial: { title: page.title, slug: page.slug, section: page.section },
    schema: pageUpdateSchema as unknown as z.ZodType<{ title: string; slug: string; section: PageSection }>,
    partial: true,
    onSubmit: async (_values, patch) => {
      await api.put(`/admin/pages/${page.id}`, patch)
      invalidate()
    },
  })

  const publish = useMutation({
    mutationFn: (next: boolean) => api.post(`/admin/pages/${page.id}/publish`, { published: next }),
    onSuccess: invalidate,
  })

  const blocks = [...page.blocks].sort((a, b) => a.position - b.position)

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>{page.title}</h1>
        <div className="head-actions">
          <span className={`badge ${page.published ? 'badge-live' : 'badge-draft'}`} data-testid="page-status">
            {page.published ? 'Published' : 'Draft'}
          </span>
          <Link className="btn" to="/admin/pages">
            Back to pages
          </Link>
        </div>
      </div>

      <div className="admin-card">
        <h2>Details</h2>
        <form
          className="admin-form"
          onSubmit={(event) => {
            void metaForm.submit(event)
          }}
        >
          <FormField label="Title" error={metaForm.errors.title}>
            <input
              value={metaForm.values.title}
              onChange={(event) => metaForm.setField('title', event.target.value)}
            />
          </FormField>
          <FormField label="Slug" error={metaForm.errors.slug}>
            <input
              value={metaForm.values.slug}
              onChange={(event) => metaForm.setField('slug', event.target.value)}
            />
          </FormField>
          <FormField label="Section" error={metaForm.errors.section}>
            <select
              value={metaForm.values.section}
              onChange={(event) => metaForm.setField('section', event.target.value as PageSection)}
            >
              {['general', 'about', 'contact', 'academics', 'excellence', 'faculty'].map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </FormField>
          <SaveStatus status={metaForm.status} message={metaForm.message} />
          <div className="editor-actions">
            <button type="submit" className="btn-primary" disabled={metaForm.saving}>
              {metaForm.saving ? 'Saving…' : 'Save details'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={publish.isPending}
              onClick={() => publish.mutate(!page.published)}
              data-testid="toggle-page-publish"
            >
              {page.published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
          {publish.isError && (
            <p className="field-error" role="alert">
              {publish.error instanceof Error ? publish.error.message : 'Publish failed.'}
            </p>
          )}
        </form>
      </div>

      <BlocksSection pageId={page.id} blocks={blocks} invalidate={invalidate} />

      <div className="admin-card">
        <h2>Preview</h2>
        <PreviewPanel blocks={blocks} />
      </div>
    </section>
  )
}

function blockSummary(block: BlockView): string {
  if (block.type === 'heading') return `H${block.content.level} · ${block.content.text.slice(0, 70)}`
  if (block.type === 'paragraph') return block.content.text.slice(0, 90) || '(empty paragraph)'
  if (block.type === 'list') return `${block.content.items.length} item${block.content.items.length === 1 ? '' : 's'}`
  if (block.type === 'image') return block.content.caption || block.content.alt || `media #${block.mediaId ?? '?'}`
  return `${block.items.length} image${block.items.length === 1 ? '' : 's'}`
}

function BlocksSection({
  pageId,
  blocks,
  invalidate,
}: {
  pageId: number
  blocks: BlockView[]
  invalidate: () => void
}) {
  const [addingType, setAddingType] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const addBlock = useMutation({
    mutationFn: (input: BlockInput) => api.post(`/admin/pages/${pageId}/blocks`, input),
    onSuccess: () => {
      setAddingType('')
      setActionError(null)
      invalidate()
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const updateBlock = useMutation({
    mutationFn: ({ blockId, input }: { blockId: number; input: BlockInput }) =>
      api.put(`/admin/pages/${pageId}/blocks/${blockId}`, input),
    onSuccess: () => {
      setEditingId(null)
      setActionError(null)
      invalidate()
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const removeBlock = useMutation({
    mutationFn: (blockId: number) => api.delete(`/admin/pages/${pageId}/blocks/${blockId}`),
    onSuccess: () => {
      setEditingId(null)
      setActionError(null)
      invalidate()
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.put(`/admin/pages/${pageId}/blocks/order`, { ids }),
    onSuccess: () => {
      setActionError(null)
      invalidate()
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= blocks.length) return
    const ids = blocks.map((block) => block.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(target, 0, moved)
    reorder.mutate(ids)
  }

  const toggleBlockPublished = (block: BlockView) => {
    updateBlock.mutate({
      blockId: block.id,
      input: { ...blockToInput(block), published: !block.published },
    })
  }

  const busy = addBlock.isPending || updateBlock.isPending || removeBlock.isPending || reorder.isPending

  return (
    <div className="admin-card">
      <h2>Content blocks</h2>
      <p className="field-hint">
        Blocks render top to bottom. Unpublished blocks are hidden from visitors but stay available as drafts.
      </p>

      {blocks.length === 0 ? (
        <p className="field-hint">No blocks yet — add the first one below.</p>
      ) : (
        <ol className="block-list">
          {blocks.map((block, index) => (
            <li key={block.id} className="block-row" data-testid="block-row">
              <div className="block-row-summary">
                <span className="block-type">{block.type}</span>
                <span className="block-text">{blockSummary(block)}</span>
                <span className={`badge ${block.published ? 'badge-live' : 'badge-draft'}`}>
                  {block.published ? 'Published' : 'Draft'}
                </span>
              </div>
              {editingId === block.id ? (
                <BlockForm
                  type={block.type}
                  existing={block}
                  onCancel={() => setEditingId(null)}
                  onSave={async (input) => {
                    await updateBlock.mutateAsync({ blockId: block.id, input })
                  }}
                />
              ) : (
                <div className="block-row-actions">
                  <button type="button" className="btn" onClick={() => setEditingId(block.id)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || index === 0}
                    aria-label={`Move ${block.type} block up`}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || index === blocks.length - 1}
                    aria-label={`Move ${block.type} block down`}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </button>
                  <button type="button" className="btn" disabled={busy} onClick={() => toggleBlockPublished(block)}>
                    {block.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Confirm delete"
                    disabled={busy}
                    onConfirm={() => removeBlock.mutate(block.id)}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {actionError && (
        <p className="field-error" role="alert">
          {actionError}
        </p>
      )}

      <div className="add-block-bar">
        <label>
          Block type
          <select
            value={addingType}
            onChange={(event) => {
              setAddingType(event.target.value)
              setEditingId(null)
            }}
          >
            <option value="">Choose…</option>
            {blockTypeLabels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="field-hint">Pick a type to open the block form.</span>
      </div>

      {addingType !== '' && (
        <BlockForm
          type={addingType as BlockView['type']}
          onCancel={() => setAddingType('')}
          onSave={async (input) => {
            await addBlock.mutateAsync(input)
          }}
        />
      )}
    </div>
  )
}

function PreviewPanel({ blocks }: { blocks: BlockView[] }) {
  const [mode, setMode] = useState<'draft' | 'public' | null>(null)
  const visible = mode === 'public' ? blocks.filter((block) => block.published) : blocks
  return (
    <>
      <div className="editor-actions">
        <button type="button" className="btn" onClick={() => setMode('draft')}>
          Draft preview
        </button>
        <button type="button" className="btn" onClick={() => setMode('public')}>
          As visitors see it
        </button>
        {mode && (
          <button type="button" className="btn" onClick={() => setMode(null)}>
            Close preview
          </button>
        )}
      </div>
      {mode && (
        <div className="preview-panel" data-testid="preview-panel">
          <p className="field-hint">
            {mode === 'draft' ? 'Draft preview — includes unpublished blocks.' : 'Public view — unpublished blocks are hidden.'}
          </p>
          {visible.length === 0 ? (
            <p className="field-hint">No blocks to show.</p>
          ) : (
            <PageBlocks blocks={visible} />
          )}
        </div>
      )}
    </>
  )
}
