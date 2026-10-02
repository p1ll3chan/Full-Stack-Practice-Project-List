import { describe, expect, it } from 'vitest'
import {
  blockSchema,
  courseCreateSchema,
  degreeLevelCreateSchema,
  excellenceCreateSchema,
  issuesToErrors,
  mediaCreateSchema,
  pageCreateSchema,
} from './schemas'

describe('admin schemas mirror backend validation', () => {
  it('accepts lowercase slugs and rejects spaces or uppercase', () => {
    expect(pageCreateSchema.safeParse({ title: 'News', slug: 'admission-2026' }).success).toBe(true)
    const bad = pageCreateSchema.safeParse({ title: 'News', slug: 'Admission 2026' })
    expect(bad.success).toBe(false)
  })

  it('requires a title and defaults section and published', () => {
    const missingTitle = pageCreateSchema.safeParse({ title: '   ', slug: 'news' })
    expect(missingTitle.success).toBe(false)

    const parsed = pageCreateSchema.safeParse({ title: 'News', slug: 'news' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.section).toBe('general')
      expect(parsed.data.published).toBe(false)
      expect(parsed.data.blocks).toEqual([])
    }
  })

  it('requires a media id for image blocks', () => {
    const result = blockSchema.safeParse({ type: 'image', content: { alt: 'Campus' } })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.includes('mediaId'))).toBe(true)
  })

  it('keeps heading levels within 1 to 6', () => {
    expect(blockSchema.safeParse({ type: 'heading', content: { text: 'Hi', level: 7 } }).success).toBe(false)
    expect(blockSchema.safeParse({ type: 'heading', content: { text: 'Hi', level: 3 } }).success).toBe(true)
  })

  it('bounds course credits and ids', () => {
    expect(courseCreateSchema.safeParse({ title: 'Physics', credits: 1000 }).success).toBe(false)
    expect(courseCreateSchema.safeParse({ title: 'Physics', credits: -1 }).success).toBe(false)
    expect(courseCreateSchema.safeParse({ title: 'Physics', credits: 4 }).success).toBe(true)
    expect(courseCreateSchema.safeParse({ title: 'Physics', degreeLevelId: 0 }).success).toBe(false)
  })

  it('accepts only http(s) or root-relative media urls', () => {
    expect(mediaCreateSchema.safeParse({ url: 'https://example.com/a.png' }).success).toBe(true)
    expect(mediaCreateSchema.safeParse({ url: '/images/a.png' }).success).toBe(true)
    expect(mediaCreateSchema.safeParse({ url: 'ftp://example.com/a.png' }).success).toBe(false)
    expect(mediaCreateSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
    expect(mediaCreateSchema.safeParse({ url: '//evil.example/a.png' }).success).toBe(false)
  })

  it('validates degree level codes', () => {
    expect(degreeLevelCreateSchema.safeParse({ code: 'BSC', name: 'Bachelor' }).success).toBe(true)
    expect(degreeLevelCreateSchema.safeParse({ code: 'B SC', name: 'Bachelor' }).success).toBe(false)
    expect(degreeLevelCreateSchema.safeParse({ code: '', name: 'Bachelor' }).success).toBe(false)
  })

  it('bounds excellence years', () => {
    expect(excellenceCreateSchema.safeParse({ title: 'Gold', year: 1800 }).success).toBe(false)
    expect(excellenceCreateSchema.safeParse({ title: 'Gold', year: 2024 }).success).toBe(true)
  })

  it('maps zod issues to field keys', () => {
    const parsed = pageCreateSchema.safeParse({ title: '', slug: 'Bad Slug' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const errors = issuesToErrors(parsed.error)
      expect(Object.keys(errors)).toEqual(expect.arrayContaining(['title', 'slug']))
    }
  })
})
