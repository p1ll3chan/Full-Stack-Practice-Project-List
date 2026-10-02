import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import type { z } from 'zod'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { ExcellenceDomain, ExcellenceItem } from '../api/types'
import { ErrorState, Loading } from '../components/states'
import { qs } from './api'
import { FormField, SaveStatus } from './form'
import { useForm } from './useForm'
import { excellenceCreateSchema, excellenceUpdateSchema } from './schemas'

type ItemFormValues = {
  title: string
  category: string
  description: string
  year: number
  domainId: number | null
  sortOrder: number
}

export default function ExcellenceEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const itemId = id === undefined ? null : Number(id)
  const createMode = itemId === null || Number.isNaN(itemId)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.excellence.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    if (!createMode && itemId !== null) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.excellenceItem(itemId) })
    }
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.excellenceItem(itemId ?? -1),
    queryFn: () => api.get<ExcellenceItem>(`/admin/excellence/${itemId}`),
    enabled: !createMode,
  })

  if (createMode) return <ItemForm item={null} invalidate={invalidate} />
  if (isLoading) return <Loading label="Loading item…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Item not loaded.')} onRetry={refetch} />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>{data.title}</h1>
        <Link to="/admin/excellence" className="btn">
          Back to excellence
        </Link>
      </div>
      <ItemForm item={data} invalidate={invalidate} />
    </section>
  )
}

function ItemForm({ item, invalidate }: { item: ExcellenceItem | null; invalidate: () => void }) {
  const createMode = item === null
  const form = useForm<ItemFormValues>({
    initial: {
      title: item?.title ?? '',
      category: item?.category ?? '',
      description: item?.description ?? '',
      year: item?.year ?? new Date().getFullYear(),
      domainId: item?.domainId ?? null,
      sortOrder: item?.sortOrder ?? 0,
    },
    schema: (createMode ? excellenceCreateSchema : excellenceUpdateSchema) as unknown as z.ZodType<ItemFormValues>,
    partial: !createMode,
    onSubmit: async (values, patch) => {
      if (createMode) {
        await api.post('/admin/excellence', values)
      } else {
        await api.put(`/admin/excellence/${item.id}`, patch)
      }
      invalidate()
    },
  })

  const { data: domains } = useQuery({
    queryKey: adminKeys.excellenceDomains.of({ limit: 100, sort: 'name' }),
    queryFn: () => api.list<ExcellenceDomain>(`/admin/excellence-domains${qs({ limit: 100, sort: 'name' })}`),
  })

  return (
    <div className="admin-card">
      <h2>{createMode ? 'New excellence item' : 'Details'}</h2>
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
          <FormField label="Category" error={form.errors.category}>
            <input
              value={form.values.category}
              onChange={(event) => form.setField('category', event.target.value)}
            />
          </FormField>
          <FormField label="Year" error={form.errors.year}>
            <input
              type="number"
              value={String(form.values.year)}
              onChange={(event) => form.setField('year', Number(event.target.value))}
            />
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
          <FormField label="Domain" error={form.errors.domainId}>
            <select
              value={form.values.domainId === null ? '' : String(form.values.domainId)}
              onChange={(event) =>
                form.setField('domainId', event.target.value === '' ? null : Number(event.target.value))
              }
            >
              <option value="">None</option>
              {(domains?.data ?? []).map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
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
        </div>
        <SaveStatus status={form.status} message={form.message} />
        <div className="editor-actions">
          <button type="submit" className="btn-primary" disabled={form.saving}>
            {form.saving ? 'Saving…' : createMode ? 'Create item' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
