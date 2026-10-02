import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { FacultyMember, Stream } from '../api/types'
import { EmptyState, ErrorState, Loading } from '../components/states'
import Pagination from '../components/Pagination'
import { qs, useDebounced } from './api'
import { ConfirmButton } from './form'

export default function FacultyManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [streamId, setStreamId] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search)
  const params = {
    q: debouncedSearch || undefined,
    streamId: streamId || undefined,
    page,
    limit: 10,
    sort: 'name',
    order: 'asc' as const,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.faculty.of(params),
    queryFn: () => api.list<FacultyMember>(`/admin/faculty${qs(params)}`),
  })

  const { data: streams } = useQuery({
    queryKey: adminKeys.streams.of({ limit: 100, sort: 'name' }),
    queryFn: () => api.list<Stream>(`/admin/streams${qs({ limit: 100, sort: 'name' })}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.faculty.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
  }

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/faculty/${id}`),
    onSuccess: invalidate,
    onError: (mutationError: Error) => window.alert(mutationError.message),
  })

  if (isLoading) return <Loading label="Loading faculty…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const rows = data?.data ?? []
  const streamNames = new Map((streams?.data ?? []).map((stream) => [stream.id, stream.name]))

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Faculty</h1>
        <Link to="/admin/faculty/new" className="btn-primary">
          New faculty member
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
            placeholder="name or department"
          />
        </label>
        <label>
          Department
          <select
            value={streamId}
            onChange={(event) => {
              setStreamId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All departments</option>
            {(streams?.data ?? []).map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No faculty match these filters." hint="Clear the filters or add a faculty member." />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Department</th>
              <th>Email</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/admin/faculty/${row.id}`}>{row.name}</Link>
                </td>
                <td>{row.title || '—'}</td>
                <td>
                  {row.streamId
                    ? (streamNames.get(row.streamId) ?? `#${row.streamId}`)
                    : row.department || '—'}
                </td>
                <td>{row.email || '—'}</td>
                <td className="table-actions">
                  <button type="button" className="btn" onClick={() => navigate(`/admin/faculty/${row.id}`)}>
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
            ? 'Only an admin token can delete faculty.'
            : remove.error?.message}
        </p>
      )}

      <Pagination meta={data?.meta ?? null} onPageChange={setPage} />
    </section>
  )
}
