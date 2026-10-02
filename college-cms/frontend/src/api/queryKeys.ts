const query = (params: object): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export interface ListParams {
  page?: number
  limit?: number
  q?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export const queryKeys = {
  pages: (params: ListParams = {}) => `/pages${query(params)}`,
  pageBySlug: (slug: string) => `/pages/${encodeURIComponent(slug)}`,
  streams: (params: ListParams & { category?: string } = {}) => `/streams${query(params)}`,
  streamBySlug: (slug: string) => `/streams/${encodeURIComponent(slug)}`,
  degreeLevels: (params: ListParams = {}) => `/degree-levels${query(params)}`,
  degreeLevelByCode: (code: string) => `/degree-levels/${encodeURIComponent(code)}`,
  courses: (params: ListParams & { stream?: string; degreeLevelId?: number } = {}) =>
    `/academics/courses${query(params)}`,
  courseById: (id: string | number) => `/academics/courses/${encodeURIComponent(String(id))}`,
  academicDetails: (streamSlug: string) => `/academics/details/${encodeURIComponent(streamSlug)}`,
  faculty: (params: ListParams & { stream?: string } = {}) => `/faculty${query(params)}`,
  facultyById: (id: string | number) => `/faculty/${encodeURIComponent(String(id))}`,
  excellence: (params: ListParams & { domain?: string } = {}) => `/excellence${query(params)}`,
  excellenceDomains: (params: ListParams = {}) => `/excellence-domains${query(params)}`,
  excellenceDomainBySlug: (slug: string) => `/excellence-domains/${encodeURIComponent(slug)}`,
  contact: () => '/contact',
  adminStats: () => '/admin/stats',
} as const

export type AdminListParams = ListParams & {
  section?: string
  published?: boolean
  active?: boolean
  status?: string
  streamId?: number | string
  degreeLevelId?: number | string
  domainId?: number | string
  levelGroup?: string
}

const k = (...parts: (string | number)[]) => ['admin', ...parts] as const

function collection(root: readonly (string | number)[]) {
  return {
    root,
    of: (params: AdminListParams = {}) => [...root, params] as const,
  }
}

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => k('stats'),
  pages: collection(k('pages')),
  page: (id: number) => k('page', id),
  streams: collection(k('streams')),
  stream: (id: number) => k('stream', id),
  streamDetails: (id: number) => k('stream', id, 'details'),
  facultyDetails: (id: number) => k('stream', id, 'faculty-details'),
  courses: collection(k('courses')),
  course: (id: number) => k('course', id),
  degreeLevels: collection(k('degree-levels')),
  degreeLevel: (id: number) => k('degree-level', id),
  faculty: collection(k('faculty')),
  facultyMember: (id: number) => k('faculty-member', id),
  excellence: collection(k('excellence')),
  excellenceItem: (id: number) => k('excellence-item', id),
  excellenceDomains: collection(k('excellence-domains')),
  excellenceDomain: (id: number) => k('excellence-domain', id),
  media: collection(k('media')),
  mediaItem: (id: number) => k('media-item', id),
  contact: () => k('contact'),
} as const
