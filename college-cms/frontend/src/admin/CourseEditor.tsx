import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { Course, Stream, StreamWithLevels } from '../api/types'
import { ErrorState, Loading } from '../components/states'
import { qs } from './api'
import { FormField, SaveStatus } from './form'
import { useForm } from './useForm'

const courseSlug = z
  .string()
  .max(255)
  .refine((value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: 'must be a lowercase slug (a-z, 0-9, hyphens)',
  })

const courseFormSchema = z.object({
  code: z.string().max(20),
  slug: courseSlug,
  title: z.string().trim().min(1).max(255),
  description: z.string().max(100000),
  credits: z.number().int().min(0).max(999).nullable(),
  department: z.string().max(255),
  streamId: z.number().int().positive().nullable(),
  degreeLevelId: z.number().int().positive().nullable(),
  sortOrder: z.number().int().min(0).max(100000),
  isActive: z.boolean(),
})

type CourseFormValues = {
  code: string
  slug: string
  title: string
  description: string
  credits: number | null
  department: string
  streamId: number | null
  degreeLevelId: number | null
  sortOrder: number
  isActive: boolean
}

export default function CourseEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const courseId = id === undefined ? null : Number(id)
  const createMode = courseId === null || Number.isNaN(courseId)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.courses.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    if (!createMode && courseId !== null) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.course(courseId) })
    }
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.course(courseId ?? -1),
    queryFn: () => api.get<Course>(`/admin/courses/${courseId}`),
    enabled: !createMode,
  })

  if (createMode) return <CourseForm course={null} invalidate={invalidate} />
  if (isLoading) return <Loading label="Loading course…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Course not loaded.')} onRetry={refetch} />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>{data.title}</h1>
        <Link to="/admin/courses" className="btn">
          Back to courses
        </Link>
      </div>
      <CourseForm course={data} invalidate={invalidate} />
    </section>
  )
}

function CourseForm({ course, invalidate }: { course: Course | null; invalidate: () => void }) {
  const createMode = course === null
  const form = useForm<CourseFormValues>({
    initial: {
      code: course?.code ?? '',
      slug: course?.slug ?? '',
      title: course?.title ?? '',
      description: course?.description ?? '',
      credits: course?.credits ?? 3,
      department: course?.department ?? '',
      streamId: course?.streamId ?? null,
      degreeLevelId: course?.degreeLevelId ?? null,
      sortOrder: course?.sortOrder ?? 0,
      isActive: course?.isActive ?? true,
    },
    schema: courseFormSchema,
    partial: !createMode,
    onSubmit: async (values, patch) => {
      const source = createMode ? values : patch
      const body: Record<string, unknown> = { ...source }
      if ('code' in body) body.code = body.code === '' ? null : body.code
      if ('slug' in body) body.slug = body.slug === '' ? null : body.slug

      const streamId = 'streamId' in body ? (body.streamId as number | null) : values.streamId
      const levelId = 'degreeLevelId' in body ? (body.degreeLevelId as number | null) : values.degreeLevelId
      if (streamId !== null && levelId !== null && levelOptions.length > 0 && !levelIds.has(levelId)) {
        throw new Error('That degree level is not linked to the selected department. Fix the pairing.')
      }

      if (createMode) {
        if (body.code === null) delete body.code
        if (body.slug === null) delete body.slug
        await api.post('/admin/courses', body)
      } else {
        await api.put(`/admin/courses/${course.id}`, body)
      }
      invalidate()
    },
  })

  const selectedStreamId = form.values.streamId
  const { data: streamData } = useQuery({
    queryKey: adminKeys.stream(selectedStreamId ?? -1),
    queryFn: () => api.get<StreamWithLevels>(`/admin/streams/${selectedStreamId ?? -1}`),
    enabled: selectedStreamId !== null,
  })

  const { data: streams } = useQuery({
    queryKey: adminKeys.streams.of({ limit: 100, sort: 'name' }),
    queryFn: () => api.list<Stream>(`/admin/streams${qs({ limit: 100, sort: 'name' })}`),
  })

  const levelOptions = streamData?.degreeLevels ?? []
  const levelIds = new Set(levelOptions.map((level) => level.id))

  return (
    <div className="admin-card">
      <h2>{createMode ? 'New course' : 'Details'}</h2>
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField label="Title" error={form.errors.title}>
          <input value={form.values.title} onChange={(event) => form.setField('title', event.target.value)} />
        </FormField>
        <div className="form-grid">
          <FormField label="Code" hint="optional, e.g. CS101" error={form.errors.code}>
            <input value={form.values.code} onChange={(event) => form.setField('code', event.target.value)} />
          </FormField>
          <FormField label="Slug" hint="optional; lowercase letters, digits and hyphens" error={form.errors.slug}>
            <input value={form.values.slug} onChange={(event) => form.setField('slug', event.target.value)} />
          </FormField>
        </div>
        <FormField label="Description" error={form.errors.description}>
          <textarea
            rows={5}
            value={form.values.description}
            onChange={(event) => form.setField('description', event.target.value)}
          />
        </FormField>
        <div className="form-grid">
          <FormField label="Credits" error={form.errors.credits}>
            <input
              type="number"
              value={form.values.credits === null ? '' : String(form.values.credits)}
              onChange={(event) =>
                form.setField('credits', event.target.value === '' ? null : Number(event.target.value))
              }
            />
          </FormField>
          <FormField label="Department label" hint="free-text fallback" error={form.errors.department}>
            <input
              value={form.values.department}
              onChange={(event) => form.setField('department', event.target.value)}
            />
          </FormField>
        </div>
        <div className="form-grid">
          <FormField label="Department" error={form.errors.streamId}>
            <select
              value={form.values.streamId === null ? '' : String(form.values.streamId)}
              onChange={(event) => {
                const value = event.target.value === '' ? null : Number(event.target.value)
                form.setField('streamId', value)
                form.setField('degreeLevelId', null)
              }}
            >
              <option value="">No department</option>
              {(streams?.data ?? []).map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.name}
                  {stream.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Degree level"
            hint={
              form.values.streamId === null
                ? 'Choose a department first — levels come from its degree-level links.'
                : 'Must be linked to the chosen department.'
            }
            error={form.errors.degreeLevelId}
          >
            <select
              value={form.values.degreeLevelId === null ? '' : String(form.values.degreeLevelId)}
              disabled={form.values.streamId === null}
              onChange={(event) =>
                form.setField('degreeLevelId', event.target.value === '' ? null : Number(event.target.value))
              }
            >
              <option value="">{form.values.streamId === null ? '—' : 'No degree level'}</option>
              {levelOptions.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name} ({level.code})
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="form-grid">
          <FormField label="Sort order" error={form.errors.sortOrder}>
            <input
              type="number"
              value={String(form.values.sortOrder)}
              onChange={(event) => form.setField('sortOrder', Number(event.target.value))}
            />
          </FormField>
          <label className="checkbox checkbox-spaced">
            <input
              type="checkbox"
              checked={form.values.isActive}
              onChange={(event) => form.setField('isActive', event.target.checked)}
            />
            Active
          </label>
        </div>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Saving…' : createMode ? 'Create course' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
