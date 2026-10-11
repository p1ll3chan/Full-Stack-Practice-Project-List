import { useEffect, useMemo, useState } from 'react'
import { useAllStreams, useStreamList } from '../api/hooks'
import DepartmentCard from '../components/DepartmentCard'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import ResultsCount from '../components/ResultsCount'
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/states'
import { IconSearch } from '../components/icons'

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

  const filtersActive = Boolean(debouncedSearch || category)

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setCategory('')
    setPage(1)
  }

  const total = meta?.total ?? streams.length

  return (
    <section>
      <PageHeader
        title="Departments"
        subtitle="Explore every department, its programmes and courses."
        eyebrow="Academics"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Departments' }]}
      />

      <div className="list-toolbar">
        <div className="search-field">
          <label htmlFor="dept-search" className="visually-hidden">
            Search departments
          </label>
          <IconSearch size={18} />
          <input
            id="dept-search"
            type="search"
            value={search}
            placeholder="Search by name, slug or tagline…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-select">
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
      </div>

      <ResultsCount count={!loading && !error ? total : null} singular="department" plural="departments" />

      {loading && <CardGridSkeleton label="Loading departments…" />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} title="Could not load departments" />}
      {!loading && !error && streams.length === 0 && (
        <EmptyState
          message={filtersActive ? 'No departments match your filters.' : 'No departments available yet.'}
          hint={filtersActive ? 'Try a different search or category.' : undefined}
          action={filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined}
        />
      )}
      {!loading && !error && streams.length > 0 && (
        <>
          <ul className="card-grid">
            {streams.map((stream) => (
              <li key={stream.id}>
                <DepartmentCard stream={stream} />
              </li>
            ))}
          </ul>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}
    </section>
  )
}
