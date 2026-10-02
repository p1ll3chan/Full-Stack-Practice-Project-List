import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { Course, Stream } from '../api/types'
import { EmptyState, ErrorState, Loading } from '../components/states'
import Pagination from '../components/Pagination'
import { qs, useDebounced } from './api'
import { ConfirmButton } from './form'

export default function CoursesManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [streamId, setStreamId] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search)
  const params = {
    q: debouncedSearch || undefined,
    streamId: streamId || undefined,
    active: active === '' ? undefined : active === 'true',
    page,
    limit: 10,
    sort: 'code',
    order: 'asc' as const,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.courses.of(params),
    queryFn: () => api.list<Course>(`/admin/courses${qs(params)}`),
  })

  const { data: streams } = useQuery({
    queryKey: adminKeys.streams.of({ limit: 100, sort: 'name' }),
    queryFn: () => api.list<Stream>(`/admin/streams${qs({ limit: 100, sort: 'name' })}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.courses.root })
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
  }

  const setActiveMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) =>
      api.post(`/admin/courses/${id}/active`, { isActive: next }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/courses/${id}`),
    onSuccess: invalidate,
    onError: (mutationError: Error) => window.alert(mutationError.message),
  })

  if (isLoading) return <Loading label="Loading courses…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const rows = data?.data ?? []
  const streamNames = new Map((streams?.data ?? []).map((stream) => [stream.id, stream.name]))

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Courses</h1>
        <Link to="/admin/courses/new" className="btn-primary">
          New course
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
            placeholder="code or title"
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
        <EmptyState message="No courses match these filters." hint="Clear the filters or create a course." />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Credits</th>
              <th>Department</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <code>{row.code ?? '—'}</code>
                </td>
                <td>
                  <Link to={`/admin/courses/${row.id}`}>{row.title}</Link>
                </td>
                <td>{row.credits ?? '—'}</td>
                <td>{row.streamId ? (streamNames.get(row.streamId) ?? `#${row.streamId}`) : '—'}</td>
                <td>
                  <span className={`badge ${row.isActive ? 'badge-live' : 'badge-draft'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-actions">
                  <button type="button" className="btn" onClick={() => navigate(`/admin/courses/${row.id}`)}>
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
            ? 'Only an admin token can delete courses.'
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
