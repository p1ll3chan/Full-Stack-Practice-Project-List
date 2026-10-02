import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { DegreeLevel } from '../api/types'
import { EmptyState, ErrorState, Loading } from '../components/states'
import Pagination from '../components/Pagination'
import { qs, useDebounced } from './api'
import { ConfirmButton } from './form'

const levelGroups = ['undergraduate', 'postgraduate', 'doctoral', 'vocational', 'diploma'] as const

export default function DegreeLevelsManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [levelGroup, setLevelGroup] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search)
  const params = {
    q: debouncedSearch || undefined,
    levelGroup: levelGroup || undefined,
    active: active === '' ? undefined : active === 'true',
    page,
    limit: 10,
    sort: 'sortOrder',
    order: 'asc' as const,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.degreeLevels.of(params),
    queryFn: () => api.list<DegreeLevel>(`/admin/degree-levels${qs(params)}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.degreeLevels.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
  }

  const setActiveMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) =>
      api.post(`/admin/degree-levels/${id}/active`, { isActive: next }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/degree-levels/${id}`),
    onSuccess: invalidate,
    onError: (mutationError: Error) => window.alert(mutationError.message),
  })

  if (isLoading) return <Loading label="Loading degree levels…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const rows = data?.data ?? []

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Degree levels</h1>
        <Link to="/admin/academics/degree-levels/new" className="btn-primary">
          New degree level
        </Link>
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
            placeholder="code or name"
          />
        </label>
        <label>
          Group
          <select
            value={levelGroup}
            onChange={(event) => {
              setLevelGroup(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All groups</option>
            {levelGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={active}
            onChange={(event) => {
              setActive(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Any</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No degree levels match these filters." hint="Create the first degree level." />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Group</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <code>{row.code}</code>
                </td>
                <td>
                  <Link to={`/admin/academics/degree-levels/${row.id}`}>{row.name}</Link>
                </td>
                <td>{row.levelGroup}</td>
                <td>
                  <span className={`badge ${row.isActive ? 'badge-live' : 'badge-draft'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => navigate(`/admin/academics/degree-levels/${row.id}`)}
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
            ? 'Only an admin token can delete degree levels.'
            : remove.error?.message}
        </p>
      )}
      {setActiveMutation.isError && (
        <p className="field-error" role="alert">
          {setActiveMutation.error?.message}
        </p>
      )}

      <Pagination meta={data?.meta ?? null} onPageChange={setPage} />
    </section>
  )
}
