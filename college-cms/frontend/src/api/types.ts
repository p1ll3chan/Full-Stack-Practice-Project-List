export interface ListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Envelope<T> {
  data: T
}

export interface ListEnvelope<T> {
  data: T[]
  meta: ListMeta
}

export interface ErrorDetail {
  path?: string
  message: string
}

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'invalid_json'
  | 'payload_too_large'
  | 'invalid_reference'
  | 'internal_error'
  | 'network_error'

export interface ErrorBody {
  error: {
    code: string
    message: string
    details?: ErrorDetail[]
  }
}

export type PageSection = 'general' | 'about' | 'contact' | 'academics' | 'excellence' | 'faculty'

export interface PageListItem {
  id: number
  slug: string
  title: string
  section: PageSection
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface MediaRef {
  id: number
  url: string | null
  altText: string
  fileName: string | null
  mimeType: string | null
  width: number | null
  height: number | null
}

export type HeadingContent = { text: string; level: number }
export type ParagraphContent = { text: string; rich?: RichDoc }
export type ListContent = { ordered: boolean; items: string[] }
export type ImageContent = { alt: string; caption: string }
export type GalleryContent = { caption: string }

export type BlockView =
  | {
      id: number
      pageId: number
      position: number
      published: boolean
      mediaId?: number | null
      type: 'heading'
      content: HeadingContent
      media?: null
      items?: undefined
    }
  | {
      id: number
      pageId: number
      position: number
      published: boolean
      mediaId?: number | null
      type: 'paragraph'
      content: ParagraphContent
      media?: null
      items?: undefined
    }
  | {
      id: number
      pageId: number
      position: number
      published: boolean
      mediaId?: number | null
      type: 'list'
      content: ListContent
      media?: null
      items?: undefined
    }
  | {
      id: number
      pageId: number
      position: number
      published: boolean
      mediaId?: number | null
      type: 'image'
      content: ImageContent
      media: MediaRef | null
      items?: undefined
    }
  | {
      id: number
      pageId: number
      position: number
      published: boolean
      mediaId?: number | null
      type: 'gallery'
      content: GalleryContent
      media?: null
      items: { id: number; mediaId: number; position?: number; caption: string }[]
    }

export type PageBlockType = BlockView['type']

export type BlockInput =
  | { type: 'heading'; content: { text: string; level: number }; published?: boolean }
  | { type: 'paragraph'; content: { text: string; rich?: RichDoc }; published?: boolean }
  | { type: 'list'; content: { ordered: boolean; items: string[] }; published?: boolean }
  | { type: 'image'; content: { alt?: string; caption?: string }; mediaId: number; published?: boolean }
  | {
      type: 'gallery'
      content: { caption?: string }
      published?: boolean
      items?: { mediaId: number; caption?: string }[]
    }

export interface PageWithBlocks extends PageListItem {
  blocks: BlockView[]
}

export interface Stream {
  id: number
  slug: string
  name: string
  tagline: string
  shortDescription: string
  category: string
  iconSvg: string
  imageMediaId: number | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DegreeLevel {
  id: number
  code: string
  name: string
  levelGroup: 'undergraduate' | 'postgraduate' | 'doctoral' | 'vocational' | 'diploma'
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StreamWithLevels extends Stream {
  degreeLevels: DegreeLevel[]
}

export interface DegreeLevelWithStreams extends DegreeLevel {
  streams: Stream[]
}

export interface Course {
  id: number
  code: string | null
  slug: string | null
  title: string
  description: string
  credits: number | null
  department: string
  streamId: number | null
  degreeLevelId: number | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FacultyMember {
  id: number
  name: string
  title: string
  department: string
  email: string
  bio: string
  streamId: number | null
  photoMediaId: number | null
  createdAt: string
  updatedAt: string
}

export interface ExcellenceDomain {
  id: number
  slug: string
  name: string
  description: string
  color: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ExcellenceItem {
  id: number
  title: string
  category: string
  description: string
  year: number
  domainId: number | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CollegeContact {
  id: number
  collegeName: string
  tagline: string
  address: string
  phone: string
  email: string
  officeHours: string
  mapEmbedUrl: string
  createdAt: string
  updatedAt: string
}

export interface AcademicDetails {
  stream: Stream
  details: {
    id: number
    streamId: number
    overview: RichDoc
    programsHtml: string
    createdAt: string
    updatedAt: string
  } | null
}

export interface FacultyDetailsResponse {
  streamId: number
  intro: RichDoc | null
}

export interface Media {
  id: number
  sourceSystem: string
  sourceRef: string
  url: string | null
  fileName: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  altText: string
  status: 'referenced' | 'ready' | 'missing'
  createdAt: string
  updatedAt: string
}

export interface AdminStats {
  pages: number
  pagesPublished: number
  pagesDraft: number
  courses: number
  coursesActive: number
  streams: number
  streamsActive: number
  faculty: number
  excellence: number
  media: number
}

export type RichTextAlign = 'auto' | 'left' | 'center' | 'right' | 'justify'

export interface RichTextRun {
  text: string
  bold?: boolean
  underline?: boolean
  foreground?: string
  background?: string
  href?: string
  target?: string
}

export interface RichParagraph {
  type: 'paragraph'
  align: RichTextAlign
  runs: RichTextRun[]
}

export interface RichHeading {
  type: 'heading'
  level: number
  align: RichTextAlign
  runs: RichTextRun[]
}

export interface RichList {
  type: 'list'
  ordered: boolean
  items: RichTextRun[][]
}

export type RichNode = RichParagraph | RichHeading | RichList

export interface RichDoc {
  nodes: RichNode[]
}
