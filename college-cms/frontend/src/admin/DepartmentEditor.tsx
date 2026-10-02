import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { AcademicDetails, DegreeLevel, FacultyDetailsResponse, StreamWithLevels } from '../api/types'
import { ErrorState, Loading } from '../components/states'
import { qs } from './api'
import MediaPicker from './MediaPicker'
import { FormField, SaveStatus } from './form'
import { useForm } from './useForm'
import { hasNonParagraphNodes, richDocToText, textToRichDoc } from './rich'
import { streamCreateSchema, streamUpdateSchema } from './schemas'

type DetailsFormValues = {
  slug: string
  name: string
  tagline: string
  shortDescription: string
  category: string
  iconSvg: string
  imageMediaId: number | null
  sortOrder: number
  isActive: boolean
}

export default function DepartmentEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const departmentId = id === undefined ? null : Number(id)
  const createMode = departmentId === null || Number.isNaN(departmentId)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.streams.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    void queryClient.invalidateQueries({ queryKey: adminKeys.degreeLevels.root })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'degree-level'] })
    if (!createMode && departmentId !== null) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.stream(departmentId) })
      void queryClient.invalidateQueries({ queryKey: adminKeys.streamDetails(departmentId) })
      void queryClient.invalidateQueries({ queryKey: adminKeys.facultyDetails(departmentId) })
    }
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.stream(departmentId ?? -1),
    queryFn: () => api.get<StreamWithLevels>(`/admin/streams/${departmentId}`),
    enabled: !createMode,
  })

  if (createMode) return <CreateDepartmentForm invalidate={invalidate} />
  if (isLoading) return <Loading label="Loading department…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Department not loaded.')} onRetry={refetch} />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>{data.name}</h1>
        <div className="head-actions">
          <span className={`badge ${data.isActive ? 'badge-live' : 'badge-draft'}`}>
            {data.isActive ? 'Active' : 'Inactive'}
          </span>
          <Link to="/admin/departments" className="btn">
            Back to departments
          </Link>
        </div>
      </div>

      <DetailsCard stream={data} invalidate={invalidate} />
      <DegreeLevelsCard streamId={departmentId} selected={data.degreeLevels} invalidate={invalidate} />
      <AcademicDetailsCard streamId={departmentId} invalidate={invalidate} />
      <FacultyIntroCard streamId={departmentId} invalidate={invalidate} />
    </section>
  )
}

function CreateDepartmentForm({ invalidate }: { invalidate: () => void }) {
  const navigate = useNavigate()
  const form = useForm<{ slug: string; name: string; tagline: string; isActive: boolean }>({
    initial: { slug: '', name: '', tagline: '', isActive: true },
    schema: streamCreateSchema as unknown as z.ZodType<{
      slug: string
      name: string
      tagline: string
      isActive: boolean
    }>,
    onSubmit: async (values) => {
      await api.post('/admin/streams', values)
      invalidate()
      navigate('/admin/departments')
    },
  })

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>New department</h1>
        <Link to="/admin/departments" className="btn">
          Back to departments
        </Link>
      </div>
      <form
        className="admin-form admin-card"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField label="Name" error={form.errors.name}>
          <input value={form.values.name} onChange={(event) => form.setField('name', event.target.value)} />
        </FormField>
        <FormField label="Slug" hint="lowercase letters, digits and hyphens" error={form.errors.slug}>
          <input value={form.values.slug} onChange={(event) => form.setField('slug', event.target.value)} />
        </FormField>
        <FormField label="Tagline" error={form.errors.tagline}>
          <input value={form.values.tagline} onChange={(event) => form.setField('tagline', event.target.value)} />
        </FormField>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.values.isActive}
            onChange={(event) => form.setField('isActive', event.target.checked)}
          />
          Active
        </label>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Creating…' : 'Create department'}
          </button>
        </div>
      </form>
    </section>
  )
}

function DetailsCard({ stream, invalidate }: { stream: StreamWithLevels; invalidate: () => void }) {
  const form = useForm<DetailsFormValues>({
    initial: {
      slug: stream.slug,
      name: stream.name,
      tagline: stream.tagline,
      shortDescription: stream.shortDescription,
      category: stream.category,
      iconSvg: stream.iconSvg,
      imageMediaId: stream.imageMediaId,
      sortOrder: stream.sortOrder,
      isActive: stream.isActive,
    },
    schema: streamUpdateSchema as unknown as z.ZodType<DetailsFormValues>,
    partial: true,
    onSubmit: async (_values, patch) => {
      await api.put(`/admin/streams/${stream.id}`, patch)
      invalidate()
    },
  })

  return (
    <div className="admin-card">
      <h2>Details</h2>
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField label="Name" error={form.errors.name}>
          <input value={form.values.name} onChange={(event) => form.setField('name', event.target.value)} />
        </FormField>
        <FormField label="Slug" error={form.errors.slug}>
          <input value={form.values.slug} onChange={(event) => form.setField('slug', event.target.value)} />
        </FormField>
        <FormField label="Tagline" error={form.errors.tagline}>
          <input
            value={form.values.tagline}
            onChange={(event) => form.setField('tagline', event.target.value)}
          />
        </FormField>
        <FormField label="Short description" error={form.errors.shortDescription}>
          <textarea
            rows={3}
            value={form.values.shortDescription}
            onChange={(event) => form.setField('shortDescription', event.target.value)}
          />
        </FormField>
        <FormField label="Category" error={form.errors.category}>
          <input value={form.values.category} onChange={(event) => form.setField('category', event.target.value)} />
        </FormField>
        <MediaPicker
          value={form.values.imageMediaId}
          onChange={(id) => form.setField('imageMediaId', id)}
          label="Cover image"
        />
        <FormField label="Sort order" error={form.errors.sortOrder}>
          <input
            type="number"
            value={String(form.values.sortOrder)}
            onChange={(event) => form.setField('sortOrder', Number(event.target.value))}
          />
        </FormField>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.values.isActive}
            onChange={(event) => form.setField('isActive', event.target.checked)}
          />
          Active
        </label>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DegreeLevelsCard({
  streamId,
  selected,
  invalidate,
}: {
  streamId: number
  selected: StreamWithLevels['degreeLevels']
  invalidate: () => void
}) {
  const [checked, setChecked] = useState<number[]>(selected.map((level) => level.id))
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: levels, isLoading } = useQuery({
    queryKey: adminKeys.degreeLevels.of({ limit: 100, sort: 'name' }),
    queryFn: () => api.list<DegreeLevel>(`/admin/degree-levels${qs({ limit: 100, sort: 'name' })}`),
  })

  const save = useMutation({
    mutationFn: (ids: number[]) => api.put(`/admin/streams/${streamId}/degree-levels`, { ids }),
    onSuccess: () => {
      setMessage('Degree levels saved.')
      setError(null)
      invalidate()
    },
    onError: (mutationError: Error) => {
      setMessage(null)
      setError(mutationError.message)
    },
  })

  const toggle = (id: number, on: boolean) => {
    setChecked((current) => (on ? [...current, id] : current.filter((value) => value !== id)))
    setMessage(null)
    setError(null)
  }

  return (
    <div className="admin-card">
      <h2>Degree levels</h2>
      <p className="field-hint">
        This department is listed under the checked degree levels. Removing a level fails while courses still use the
        combination.
      </p>
      {isLoading ? (
        <Loading label="Loading degree levels…" />
      ) : (
        <ul className="check-list">
          {(levels?.data ?? []).map((level) => (
            <li key={level.id}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={checked.includes(level.id)}
                  onChange={(event) => toggle(level.id, event.target.checked)}
                />
                {level.name} <code>{level.code}</code>
                {!level.isActive && <span className="badge badge-draft">inactive</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
      <SaveStatus status={save.isPending ? 'saving' : error ? 'error' : message ? 'saved' : 'idle'} message={error ?? message} />
      <div className="editor-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={save.isPending}
          onClick={() => save.mutate(checked)}
        >
          {save.isPending ? 'Saving…' : 'Save degree levels'}
        </button>
      </div>
    </div>
  )
}

function AcademicDetailsCard({ streamId, invalidate }: { streamId: number; invalidate: () => void }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.streamDetails(streamId),
    queryFn: () => api.get<AcademicDetails>(`/admin/streams/${streamId}/details`),
  })

  if (isLoading) return <Loading label="Loading academic details…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const details = data?.details ?? null

  return (
    <AcademicDetailsForm
      key={details?.id ?? 'none'}
      streamId={streamId}
      overviewText={richDocToText(details?.overview)}
      programsHtml={details?.programsHtml ?? ''}
      complexOverview={hasNonParagraphNodes(details?.overview)}
      invalidate={invalidate}
    />
  )
}

function AcademicDetailsForm({
  streamId,
  overviewText,
  programsHtml,
  complexOverview,
  invalidate,
}: {
  streamId: number
  overviewText: string
  programsHtml: string
  complexOverview: boolean
  invalidate: () => void
}) {
  const form = useForm<{ overviewText: string; programsHtml: string }>({
    initial: { overviewText, programsHtml },
    schema: z.object({
      overviewText: z.string().max(200000),
      programsHtml: z.string().max(500000),
    }),
    partial: true,
    onSubmit: async (_values, patch) => {
      const body: { overview?: { nodes: unknown[] }; programsHtml?: string } = {}
      if ('overviewText' in patch) body.overview = textToRichDoc(patch.overviewText ?? '')
      if ('programsHtml' in patch) body.programsHtml = patch.programsHtml ?? ''
      if (Object.keys(body).length === 0) return
      await api.put(`/admin/streams/${streamId}/details`, body)
      invalidate()
    },
  })

  return (
    <div className="admin-card">
      <h2>Academic details</h2>
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField
          label="Overview (one paragraph per line)"
          hint={
            complexOverview
              ? 'The saved overview contains headings or lists. Saving replaces them with plain paragraphs.'
              : 'Each non-empty line becomes a paragraph.'
          }
          error={form.errors.overviewText}
        >
          <textarea
            rows={8}
            value={form.values.overviewText}
            onChange={(event) => form.setField('overviewText', event.target.value)}
          />
        </FormField>
        <FormField
          label="Programs (HTML)"
          hint="Raw HTML shown in the programs section of the public page."
          error={form.errors.programsHtml}
        >
          <textarea
            rows={6}
            value={form.values.programsHtml}
            onChange={(event) => form.setField('programsHtml', event.target.value)}
          />
        </FormField>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Saving…' : 'Save academic details'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FacultyIntroCard({ streamId, invalidate }: { streamId: number; invalidate: () => void }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.facultyDetails(streamId),
    queryFn: () => api.get<FacultyDetailsResponse>(`/admin/streams/${streamId}/faculty-details`),
  })

  if (isLoading) return <Loading label="Loading faculty intro…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const intro = data?.intro ?? null

  return (
    <FacultyIntroForm
      key={intro === null ? 'empty' : 'filled'}
      streamId={streamId}
      introText={richDocToText(intro)}
      complexIntro={hasNonParagraphNodes(intro)}
      invalidate={invalidate}
    />
  )
}

function FacultyIntroForm({
  streamId,
  introText,
  complexIntro,
  invalidate,
}: {
  streamId: number
  introText: string
  complexIntro: boolean
  invalidate: () => void
}) {
  const form = useForm<{ introText: string }>({
    initial: { introText },
    schema: z.object({ introText: z.string().max(200000) }),
    partial: true,
    onSubmit: async (_values, patch) => {
      if (!('introText' in patch)) return
      await api.put(`/admin/streams/${streamId}/faculty-details`, { intro: textToRichDoc(patch.introText ?? '') })
      invalidate()
    },
  })

  return (
    <div className="admin-card">
      <h2>Faculty intro</h2>
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField
          label="Intro text (one paragraph per line)"
          hint={
            complexIntro
              ? 'The saved intro contains headings or lists. Saving replaces them with plain paragraphs.'
              : 'Each non-empty line becomes a paragraph.'
          }
          error={form.errors.introText}
        >
          <textarea
            rows={5}
            value={form.values.introText}
            onChange={(event) => form.setField('introText', event.target.value)}
          />
        </FormField>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Saving…' : 'Save intro'}
          </button>
        </div>
      </form>
    </div>
  )
}