import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { z } from 'zod'
import { api, ApiError } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { ExcellenceDomain } from '../api/types'
import { EmptyState, ErrorState, Loading } from '../components/states'
import { qs, useDebounced } from './api'
import { ConfirmButton, FormField, SaveStatus } from './form'
import { useForm } from './useForm'
import { excellenceDomainCreateSchema, excellenceDomainUpdateSchema } from './schemas'

export function ExcellenceDomainsManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const params = { q: debouncedSearch || undefined, limit: 50, sort: 'sortOrder', order: 'asc' as const }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.excellenceDomains.of(params),
    queryFn: () => api.list<ExcellenceDomain>(`/admin/excellence-domains${qs(params)}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.excellenceDomains.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.excellence.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
  }

  const setActiveMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) =>
      api.post(`/admin/excellence-domains/${id}/active`, { isActive: next }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/excellence-domains/${id}`),
    onSuccess: invalidate,
    onError: (mutationError: Error) => window.alert(mutationError.message),
  })

  if (isLoading) return <Loading label="Loading domains…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const rows = data?.data ?? []

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Excellence domains</h1>
        <div className="head-actions">
          <Link to="/admin/excellence" className="btn">
            Back to excellence
          </Link>
          <Link to="/admin/excellence/domains/new" className="btn-primary">
            New domain
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="name or slug" />
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No domains yet." hint="Domains group excellence items on the public site." />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Color</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/admin/excellence/domains/${row.id}`}>{row.name}</Link>
                </td>
                <td>
                  <code>{row.slug}</code>
                </td>
                <td>{row.color || '—'}</td>
                <td>
                  <span className={`badge ${row.isActive ? 'badge-live' : 'badge-draft'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => navigate(`/admin/excellence/domains/${row.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={setActiveMutation.isPending}
                    onClick={() => setActiveMutation.mutate({ id: row.id, next: !row.isActive })}
                  >
                    {row.isActive ? 'Deactivate' : 'Activate'}
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
          </tbody>
        </table>
      )}

      {remove.isError && (
        <p className="field-error" role="alert">
          {remove.error instanceof ApiError && remove.error.status === 403
            ? 'Only an admin token can delete domains.'
            : remove.error?.message}
        </p>
      )}
      {setActiveMutation.isError && (
        <p className="field-error" role="alert">
          {setActiveMutation.error?.message}
        </p>
      )}
    </section>
  )
}

type DomainFormValues = {
  slug: string
  name: string
  description: string
  color: string
  sortOrder: number
  isActive: boolean
}

export function ExcellenceDomainEditor() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const domainId = id === undefined ? null : Number(id)
  const createMode = domainId === null || Number.isNaN(domainId)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.excellenceDomains.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.excellence.root })
    if (!createMode && domainId !== null) {
      void queryClient.invalidateQueries({ queryKey: adminKeys.excellenceDomain(domainId) })
    }
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.excellenceDomain(domainId ?? -1),
    queryFn: () => api.get<ExcellenceDomain>(`/admin/excellence-domains/${domainId}`),
    enabled: !createMode,
  })

  if (createMode) return <DomainForm domain={null} invalidate={invalidate} />
  if (isLoading) return <Loading label="Loading domain…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data) return <ErrorState error={new Error('Domain not loaded.')} onRetry={refetch} />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>{data.name}</h1>
        <Link to="/admin/excellence/domains" className="btn">
          Back to domains
        </Link>
      </div>
      <DomainForm domain={data} invalidate={invalidate} />
    </section>
  )
}

function DomainForm({ domain, invalidate }: { domain: ExcellenceDomain | null; invalidate: () => void }) {
  const createMode = domain === null
  const form = useForm<DomainFormValues>({
    initial: {
      slug: domain?.slug ?? '',
      name: domain?.name ?? '',
      description: domain?.description ?? '',
      color: domain?.color ?? '',
      sortOrder: domain?.sortOrder ?? 0,
      isActive: domain?.isActive ?? true,
    },
    schema: (createMode ? excellenceDomainCreateSchema : excellenceDomainUpdateSchema) as unknown as z.ZodType<DomainFormValues>,
    partial: !createMode,
    onSubmit: async (values, patch) => {
      if (createMode) {
        await api.post('/admin/excellence-domains', values)
      } else {
        await api.put(`/admin/excellence-domains/${domain.id}`, patch)
      }
      invalidate()
    },
  })

  return (
    <div className="admin-card">
      <h2>{createMode ? 'New domain' : 'Details'}</h2>
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
        <FormField label="Description" error={form.errors.description}>
          <textarea
            rows={3}
            value={form.values.description}
            onChange={(event) => form.setField('description', event.target.value)}
          />
        </FormField>
        <div className="form-grid">
          <FormField label="Color" hint="hex, e.g. #2563eb" error={form.errors.color}>
            <input value={form.values.color} onChange={(event) => form.setField('color', event.target.value)} />
          </FormField>
          <FormField label="Sort order" error={form.errors.sortOrder}>
            <input
              type="number"
              value={String(form.values.sortOrder)}
              onChange={(event) => form.setField('sortOrder', Number(event.target.value))}
            />
          </FormField>
        </div>
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
            {form.saving ? 'Saving…' : createMode ? 'Create domain' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
