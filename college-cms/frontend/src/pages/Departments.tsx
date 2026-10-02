import { useEffect, useMemo, useState } from 'react'
import { useAllStreams, useStreamList } from '../api/hooks'
import DepartmentCard from '../components/DepartmentCard'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorState, Loading } from '../components/states'

const PAGE_SIZE = 9

export default function Departments() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { data: allStreams, loading: categoriesLoading } = useAllStreams()

  const categories = useMemo(() => {
    const values = new Set<string>()
    for (const stream of allStreams) {
      if (stream.category) values.add(stream.category)
    }
    return [...values].sort((a, b) => a.localeCompare(b))
  }, [allStreams])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: streams, meta, loading, error, refetch } = useStreamList({
    q: debouncedSearch || undefined,
    category: category || undefined,
    page,
    limit: PAGE_SIZE,
    sort: 'sortOrder',
  })

  return (
    <section>
      <PageHeader title="Departments" subtitle="Explore every department, its programmes and courses." />

      <div className="filter-bar">
        <label htmlFor="dept-search">Search departments</label>
        <input
          id="dept-search"
          type="search"
          value={search}
          placeholder="Search by name, slug or tagline…"
          onChange={(e) => setSearch(e.target.value)}
        />
        <label htmlFor="dept-category">Category</label>
        <select
          id="dept-category"
          value={category}
          disabled={categoriesLoading}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loading label="Loading departments…" />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} title="Could not load departments" />}
      {!loading && !error && streams.length === 0 && (
        <EmptyState
          message={debouncedSearch || category ? 'No departments match your filters.' : 'No departments available yet.'}
          hint={debouncedSearch || category ? 'Try a different search or category.' : undefined}
        />
      )}
      {!loading && !error && streams.length > 0 && (
        <>
          <div className="dept-grid">
            {streams.map((stream) => (
              <DepartmentCard key={stream.id} stream={stream} />
            ))}
          </div>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}
    </section>
  )
}
