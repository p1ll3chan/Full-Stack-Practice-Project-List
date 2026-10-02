import { z } from 'zod'
import type { ApiError } from '../api/client'

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)')

export function trimmed(max: number) {
  return z.string().trim().min(1).max(max)
}

const httpUrlPattern = /^https?:\/\/[^\s]+$/i

function isSafeImageUrl(value: string): boolean {
  return httpUrlPattern.test(value) || (value.startsWith('/') && !value.startsWith('//'))
}

export const imageUrl = z
  .string()
  .trim()
  .min(1, 'an image URL is required')
  .max(2000)
  .refine(isSafeImageUrl, {
    message: 'must be an http(s) URL or a root-relative path starting with /',
  })

export const optionalImageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value === '' || isSafeImageUrl(value), {
    message: 'must be an http(s) URL or a root-relative path starting with /',
  })

export const pageSections = ['general', 'about', 'contact', 'academics', 'excellence', 'faculty'] as const

const blockPublished = z.boolean().optional()

export const blockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('heading'),
    content: z.strictObject({
      text: trimmed(2000),
      level: z.number().int().min(1).max(6).default(2),
    }),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('paragraph'),
    content: z.strictObject({
      text: z.string().max(200000),
      rich: z.object({ nodes: z.array(z.unknown()).max(5000) }).optional(),
    }),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('list'),
    content: z.strictObject({
      ordered: z.boolean().default(false),
      items: z.array(z.string().max(2000)).max(500),
    }),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('image'),
    content: z.strictObject({
      alt: z.string().max(1000).default(''),
      caption: z.string().max(1000).default(''),
    }),
    mediaId: z.number().int().positive({ message: 'choose an image from the media library' }),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('gallery'),
    content: z.strictObject({ caption: z.string().max(1000).default('') }),
    published: blockPublished,
    items: z
      .array(
        z.object({
          mediaId: z.number().int().positive(),
          caption: z.string().trim().max(500).optional(),
        }),
      )
      .max(100)
      .optional(),
  }),
])

export const pageCreateSchema = z.strictObject({
  title: trimmed(255),
  slug: slugSchema,
  section: z.enum(pageSections).default('general'),
  published: z.boolean().default(false),
  blocks: z.array(blockSchema).max(200).default([]),
})

export const pageUpdateSchema = z.strictObject({
  title: trimmed(255).optional(),
  slug: slugSchema.optional(),
  section: z.enum(pageSections).optional(),
  published: z.boolean().optional(),
})

export const streamCreateSchema = z.strictObject({
  slug: slugSchema,
  name: trimmed(255),
  tagline: z.string().trim().max(255).default(''),
  shortDescription: z.string().trim().max(500).default(''),
  category: z.string().trim().max(100).default(''),
  iconSvg: z.string().max(200000).default(''),
  imageMediaId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

export const streamUpdateSchema = z.strictObject({
  slug: slugSchema.optional(),
  name: trimmed(255).optional(),
  tagline: z.string().trim().max(255).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  category: z.string().trim().max(100).optional(),
  iconSvg: z.string().max(200000).optional(),
  imageMediaId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
})

export const streamDetailsSchema = z.strictObject({
  overview: z.object({ nodes: z.array(z.unknown()).max(5000) }).optional(),
  programsHtml: z.string().max(500000).optional(),
})

export const facultyIntroSchema = z.strictObject({
  intro: z.object({ nodes: z.array(z.unknown()).max(5000) }),
})

export const courseCreateSchema = z.strictObject({
  code: z.string().trim().min(1).max(20).optional(),
  slug: slugSchema.optional(),
  title: trimmed(255),
  description: z.string().max(100000).default(''),
  credits: z.number().int().min(0).max(999).nullable().default(3),
  department: z.string().trim().max(255).default(''),
  streamId: z.number().int().positive().nullable().optional(),
  degreeLevelId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

export const courseUpdateSchema = z.strictObject({
  code: z.string().trim().min(1).max(20).nullable().optional(),
  slug: slugSchema.nullable().optional(),
  title: trimmed(255).optional(),
  description: z.string().max(100000).optional(),
  credits: z.number().int().min(0).max(999).nullable().optional(),
  department: z.string().trim().max(255).optional(),
  streamId: z.number().int().positive().nullable().optional(),
  degreeLevelId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
})

export const degreeLevelCreateSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'must be an alphanumeric code'),
  name: trimmed(100),
  levelGroup: z.enum(['undergraduate', 'postgraduate', 'doctoral', 'vocational', 'diploma']).default('undergraduate'),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

export const degreeLevelUpdateSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'must be an alphanumeric code')
    .optional(),
  name: trimmed(100).optional(),
  levelGroup: z.enum(['undergraduate', 'postgraduate', 'doctoral', 'vocational', 'diploma']).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
})

export const facultyCreateSchema = z.strictObject({
  name: trimmed(255),
  title: z.string().trim().max(255).default(''),
  department: z.string().trim().max(255).default(''),
  email: z.string().trim().max(255).default(''),
  bio: z.string().max(50000).default(''),
  streamId: z.number().int().positive().nullable().optional(),
  photoMediaId: z.number().int().positive().nullable().optional(),
})

export const facultyUpdateSchema = z.strictObject({
  name: trimmed(255).optional(),
  title: z.string().trim().max(255).optional(),
  department: z.string().trim().max(255).optional(),
  email: z.string().trim().max(255).optional(),
  bio: z.string().max(50000).optional(),
  streamId: z.number().int().positive().nullable().optional(),
  photoMediaId: z.number().int().positive().nullable().optional(),
})

export const excellenceCreateSchema = z.strictObject({
  title: trimmed(255),
  category: z.string().trim().max(100).default(''),
  description: z.string().max(50000).default(''),
  year: z.number().int().min(1900).max(2100),
  domainId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
})

export const excellenceUpdateSchema = z.strictObject({
  title: trimmed(255).optional(),
  category: z.string().trim().max(100).optional(),
  description: z.string().max(50000).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  domainId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
})

export const excellenceDomainCreateSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)'),
  name: trimmed(100),
  description: z.string().max(50000).default(''),
  color: z.string().trim().max(16).default(''),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

export const excellenceDomainUpdateSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)')
    .optional(),
  name: trimmed(100).optional(),
  description: z.string().max(50000).optional(),
  color: z.string().trim().max(16).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
})

export const contactUpsertSchema = z.strictObject({
  collegeName: z.string().trim().max(255).default(''),
  tagline: z.string().trim().max(255).default(''),
  address: z.string().trim().max(5000).default(''),
  phone: z.string().trim().max(50).default(''),
  email: z.string().trim().max(255).default(''),
  officeHours: z.string().trim().max(255).default(''),
  mapEmbedUrl: z.string().trim().max(2000).default(''),
})

export const mediaCreateSchema = z.strictObject({
  url: imageUrl,
  fileName: z.string().trim().max(255).nullable().default(null),
  altText: z.string().trim().max(5000).default(''),
  status: z.enum(['referenced', 'ready', 'missing']).default('ready'),
})

export const mediaUpdateSchema = z.strictObject({
  url: optionalImageUrl.nullable().optional(),
  fileName: z.string().trim().max(255).nullable().optional(),
  altText: z.string().trim().max(5000).optional(),
  status: z.enum(['referenced', 'ready', 'missing']).optional(),
})

export type PageCreateValues = z.output<typeof pageCreateSchema>
export type PageUpdateValues = z.output<typeof pageUpdateSchema>
export type BlockValues = z.output<typeof blockSchema>
export type StreamCreateValues = z.output<typeof streamCreateSchema>
export type StreamUpdateValues = z.output<typeof streamUpdateSchema>
export type CourseCreateValues = z.output<typeof courseCreateSchema>
export type CourseUpdateValues = z.output<typeof courseUpdateSchema>
export type DegreeLevelCreateValues = z.output<typeof degreeLevelCreateSchema>
export type FacultyCreateValues = z.output<typeof facultyCreateSchema>
export type ExcellenceCreateValues = z.output<typeof excellenceCreateSchema>
export type ExcellenceDomainCreateValues = z.output<typeof excellenceDomainCreateSchema>
export type ContactValues = z.output<typeof contactUpsertSchema>
export type MediaCreateValues = z.output<typeof mediaCreateSchema>

export function issuesToErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    if (!(key in errors)) errors[key] = issue.message
  }
  return errors
}

export function detailsToErrors(details: ApiError['details']): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const detail of details ?? []) {
    const key = detail.path || '_form'
    if (!(key in errors)) errors[key] = detail.message
  }
  return errors
}
