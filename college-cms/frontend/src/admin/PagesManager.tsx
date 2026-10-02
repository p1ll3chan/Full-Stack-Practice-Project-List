import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { PageListItem } from '../api/types'
import { EmptyState, ErrorState, Loading } from '../components/states'
import Pagination from '../components/Pagination'
import { qs, useDebounced } from './api'
import { ConfirmButton } from './form'

const sectionOptions = ['general', 'about', 'contact', 'academics', 'excellence', 'faculty'] as const

export default function PagesManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [section, setSection] = useState('')
  const [published, setPublished] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search)
  const params = {
    q: debouncedSearch || undefined,
    section: section || undefined,
    published: published === '' ? undefined : published === 'true',
    page,
    limit: 10,
    sort: 'updatedAt',
    order: 'desc' as const,
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.pages.of(params),
    queryFn: () => api.list<PageListItem>(`/admin/pages${qs(params)}`),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/admin/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pages.root })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
    onError: (mutationError: Error) => {
      window.alert(mutationError.message)
    },
  })

  if (isLoading) return <Loading label="Loading pages…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const rows = data?.data ?? []

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>Pages</h1>
        <Link to="/admin/pages/new" className="btn-primary">
          New page
        </Link>
      </div>

      <div className="filter-bar">
        <label>
          Search
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="title or slug" />
        </label>
        <label>
          Section
          <select value={section} onChange={(event) => { setSection(event.target.value); setPage(1) }}>
            <option value="">All sections</option>
            {sectionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={published} onChange={(event) => { setPublished(event.target.value); setPage(1) }}>
            <option value="">Any</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          message="No pages match these filters."
          hint="Clear the filters or create your first page."
        />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Section</th>
              <th>Status</th>
              <th>Updated</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/admin/pages/${row.id}`}>{row.title}</Link>
                </td>
                <td>
                  <code>/{row.slug}</code>
                </td>
                <td>{row.section}</td>
                <td>
                  <span className={`badge ${row.published ? 'badge-live' : 'badge-draft'}`}>
                    {row.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
                <td className="table-actions">
                  <button type="button" className="btn" onClick={() => navigate(`/admin/pages/${row.id}`)}>
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
            ? 'Only an admin token can delete pages.'
            : remove.error?.message}
        </p>
      )}

      <Pagination meta={data?.meta ?? null} onPageChange={setPage} />
    </section>
  )
}
