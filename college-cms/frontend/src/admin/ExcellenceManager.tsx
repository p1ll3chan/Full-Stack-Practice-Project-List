import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { ExcellenceDomain, ExcellenceItem } from '../api/types'
import { EmptyState, ErrorState, Loading } from '../components/states'
import Pagination from '../components/Pagination'
import { qs, useDebounced } from './api'
import { ConfirmButton } from './form'

export default function ExcellenceManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [domainId, setDomainId] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search)
  const params = {
    q: debouncedSearch || undefined,
    domainId: domainId || undefined,
    page,
    limit: 10,
    sort: 'sortOrder',
    order: 'asc' as const,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.excellence.of(params),
    queryFn: () => api.list<ExcellenceItem>(`/admin/excellence${qs(params)}`),
  })

  const { data: domains } = useQuery({
    queryKey: adminKeys.excellenceDomains.of({ limit: 100, sort: 'name' }),
    queryFn: () => api.list<ExcellenceDomain>(`/admin/excellence-domains${qs({ limit: 100, sort: 'name' })}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.excellence.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
  }

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/excellence/${id}`),
    onSuccess: invalidate,
    onError: (mutationError: Error) => window.alert(mutationError.message),
  })

  if (isLoading) return <Loading label="Loading excellence items…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const rows = data?.data ?? []
  const domainNames = new Map((domains?.data ?? []).map((domain) => [domain.id, domain.name]))

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Excellence</h1>
        <div className="head-actions">
          <Link to="/admin/excellence/domains" className="btn">
            Domains
          </Link>
          <Link to="/admin/excellence/new" className="btn-primary">
            New item
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          Search
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="title or category"
          />
        </label>
        <label>
          Domain
          <select
            value={domainId}
            onChange={(event) => {
              setDomainId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All domains</option>
            {(domains?.data ?? []).map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No excellence items match these filters." hint="Create the first item." />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Year</th>
              <th>Domain</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/admin/excellence/${row.id}`}>{row.title}</Link>
                </td>
                <td>{row.category || '—'}</td>
                <td>{row.year}</td>
                <td>{row.domainId ? (domainNames.get(row.domainId) ?? `#${row.domainId}`) : '—'}</td>
                <td className="table-actions">
                  <button type="button" className="btn" onClick={() => navigate(`/admin/excellence/${row.id}`)}>
                    Edit
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
            ? 'Only an admin token can delete excellence items.'
            : remove.error?.message}
        </p>
      )}

      <Pagination meta={data?.meta ?? null} onPageChange={setPage} />
    </section>
  )
}
