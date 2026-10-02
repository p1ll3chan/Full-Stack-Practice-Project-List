import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { DegreeLevel, DegreeLevelWithStreams } from '../api/types'
import { ErrorState, Loading } from '../components/states'
import { FormField, SaveStatus } from './form'
import { useForm } from './useForm'
import { degreeLevelCreateSchema, degreeLevelUpdateSchema } from './schemas'

const levelGroups = ['undergraduate', 'postgraduate', 'doctoral', 'vocational', 'diploma'] as const

type LevelValues = {
  code: string
  name: string
  levelGroup: (typeof levelGroups)[number]
  sortOrder: number
  isActive: boolean
}

export default function DegreeLevelEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const levelId = id === undefined ? null : Number(id)
  const createMode = levelId === null || Number.isNaN(levelId)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.degreeLevels.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    if (!createMode && levelId !== null) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.degreeLevel(levelId) })
    }
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.degreeLevel(levelId ?? -1),
    queryFn: () => api.get<DegreeLevelWithStreams>(`/admin/degree-levels/${levelId}`),
    enabled: !createMode,
  })

  if (createMode) return <LevelForm level={null} invalidate={invalidate} />
  if (isLoading) return <Loading label="Loading degree level…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Degree level not loaded.')} onRetry={refetch} />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>{data.name}</h1>
        <Link to="/admin/academics/degree-levels" className="btn">
          Back to degree levels
        </Link>
      </div>
      <LevelForm level={data} invalidate={invalidate} />
      <div className="admin-card">
        <h2>Departments</h2>
        {data.streams.length === 0 ? (
          <p className="field-hint">
            No departments linked yet — link them from a{' '}
            <Link to="/admin/departments">department’s degree levels</Link> settings.
          </p>
        ) : (
          <ul className="admin-list">
            {data.streams.map((stream) => (
              <li key={stream.id}>
                <Link to={`/admin/departments/${stream.id}`}>{stream.name}</Link>
                <span className={`badge ${stream.isActive ? 'badge-live' : 'badge-draft'}`}>
                  {stream.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function LevelForm({ level, invalidate }: { level: DegreeLevel | null; invalidate: () => void }) {
  const createMode = level === null
  const form = useForm<LevelValues>({
    initial: {
      code: level?.code ?? '',
      name: level?.name ?? '',
      levelGroup: level?.levelGroup ?? 'undergraduate',
      sortOrder: level?.sortOrder ?? 0,
      isActive: level?.isActive ?? true,
    },
    schema: (createMode ? degreeLevelCreateSchema : degreeLevelUpdateSchema) as unknown as z.ZodType<LevelValues>,
    partial: !createMode,
    onSubmit: async (values, patch) => {
      if (createMode) {
        await api.post('/admin/degree-levels', values)
      } else {
        await api.put(`/admin/degree-levels/${level.id}`, patch)
      }
      invalidate()
    },
  })

  return (
    <div className="admin-card">
      <h2>{createMode ? 'New degree level' : 'Details'}</h2>
      <form
        className="admin-form"
        onSubmit={(event) => {
          void form.submit(event)
        }}
      >
        <FormField label="Code" hint="e.g. BSC, MSC, PGDIP" error={form.errors.code}>
          <input value={form.values.code} onChange={(event) => form.setField('code', event.target.value)} />
        </FormField>
        <FormField label="Name" error={form.errors.name}>
          <input value={form.values.name} onChange={(event) => form.setField('name', event.target.value)} />
        </FormField>
        <FormField label="Level group" error={form.errors.levelGroup}>
          <select
            value={form.values.levelGroup}
            onChange={(event) => form.setField('levelGroup', event.target.value as LevelValues['levelGroup'])}
          >
            {levelGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </FormField>
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
            {form.saving ? 'Saving…' : createMode ? 'Create degree level' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
