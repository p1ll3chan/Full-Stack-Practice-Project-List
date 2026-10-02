import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import type { z } from 'zod'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { FacultyMember, Stream } from '../api/types'
import { ErrorState, Loading } from '../components/states'
import { qs } from './api'
import MediaPicker from './MediaPicker'
import { FormField, SaveStatus } from './form'
import { useForm } from './useForm'
import { facultyCreateSchema, facultyUpdateSchema } from './schemas'

type FacultyFormValues = {
  name: string
  title: string
  department: string
  email: string
  bio: string
  streamId: number | null
  photoMediaId: number | null
}

export default function FacultyEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const memberId = id === undefined ? null : Number(id)
  const createMode = memberId === null || Number.isNaN(memberId)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.faculty.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    if (!createMode && memberId !== null) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.facultyMember(memberId) })
    }
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.facultyMember(memberId ?? -1),
    queryFn: () => api.get<FacultyMember>(`/admin/faculty/${memberId}`),
    enabled: !createMode,
  })

  if (createMode) return <FacultyForm member={null} invalidate={invalidate} />
  if (isLoading) return <Loading label="Loading faculty member…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Faculty member not loaded.')} onRetry={refetch} />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>{data.name}</h1>
        <Link to="/admin/faculty" className="btn">
          Back to faculty
        </Link>
      </div>
      <FacultyForm member={data} invalidate={invalidate} />
    </section>
  )
}

function FacultyForm({ member, invalidate }: { member: FacultyMember | null; invalidate: () => void }) {
  const createMode = member === null
  const form = useForm<FacultyFormValues>({
    initial: {
      name: member?.name ?? '',
      title: member?.title ?? '',
      department: member?.department ?? '',
      email: member?.email ?? '',
      bio: member?.bio ?? '',
      streamId: member?.streamId ?? null,
      photoMediaId: member?.photoMediaId ?? null,
    },
    schema: (createMode ? facultyCreateSchema : facultyUpdateSchema) as unknown as z.ZodType<FacultyFormValues>,
    partial: !createMode,
    onSubmit: async (values, patch) => {
      if (createMode) {
        await api.post('/admin/faculty', values)
      } else {
        await api.put(`/admin/faculty/${member.id}`, patch)
      }
      invalidate()
    },
  })

  const { data: streams } = useQuery({
    queryKey: adminKeys.streams.of({ limit: 100, sort: 'name' }),
    queryFn: () => api.list<Stream>(`/admin/streams${qs({ limit: 100, sort: 'name' })}`),
  })

  return (
    <div className="admin-card">
      <h2>{createMode ? 'New faculty member' : 'Details'}</h2>
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField label="Name" error={form.errors.name}>
          <input value={form.values.name} onChange={(event) => form.setField('name', event.target.value)} />
        </FormField>
        <div className="form-grid">
          <FormField label="Title" hint="e.g. Associate Professor" error={form.errors.title}>
            <input value={form.values.title} onChange={(event) => form.setField('title', event.target.value)} />
          </FormField>
          <FormField label="Email" error={form.errors.email}>
            <input
              type="email"
              value={form.values.email}
              onChange={(event) => form.setField('email', event.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Department" hint="free-text label used when no department is linked" error={form.errors.department}>
          <input
            value={form.values.department}
            onChange={(event) => form.setField('department', event.target.value)}
          />
        </FormField>
        <FormField label="Linked department" error={form.errors.streamId}>
          <select
            value={form.values.streamId === null ? '' : String(form.values.streamId)}
            onChange={(event) =>
              form.setField('streamId', event.target.value === '' ? null : Number(event.target.value))
            }
          >
            <option value="">None</option>
            {(streams?.data ?? []).map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Bio" error={form.errors.bio}>
          <textarea rows={5} value={form.values.bio} onChange={(event) => form.setField('bio', event.target.value)} />
        </FormField>
        <MediaPicker
          value={form.values.photoMediaId}
          onChange={(photoId) => form.setField('photoMediaId', photoId)}
          label="Photo"
        />
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Saving…' : createMode ? 'Create faculty member' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
