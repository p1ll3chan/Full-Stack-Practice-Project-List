import type { RichDoc, RichDocSource } from '../db/schema.js'
import type { DepartmentCsvRow } from './csv.js'
import { DEGREE_LEVELS, parseLevelTokens, parseProgramsOffered, slugify } from './programs.js'
import { parseWixRichText } from './richText.js'

export interface ImportIssue {
  row: number | null
  column: string | null
  message: string
}

export interface DbSnapshot {
  streams: Array<{ id: number; slug: string; sourceId: string | null }>
  courses: Array<{ id: number; slug: string | null; title: string }>
  media: Array<{ id: number; sourceSystem: string; sourceRef: string }>
  degreeLevels: Array<{ id: number; code: string }>
}

export interface PlannedCourse {
  title: string
  slug: string
  levelCode: string | null
  sortOrder: number
}

export interface PlannedStream {
  sourceId: string
  sourcePath: string
  sourceOwner: string
  slug: string
  name: string
  tagline: string
  shortDescription: string
  category: string
  iconSvg: string
  sortOrder: number
  isActive: boolean
  createdAt: Date | null
  updatedAt: Date | null
  imageRef: string | null
  overview: RichDoc
  overviewSource: RichDocSource | null
  programsHtml: string
  levelCodes: string[]
  courses: PlannedCourse[]
}

export interface ImportPlan {
  degreeLevelCodes: string[]
  streams: PlannedStream[]
  errors: ImportIssue[]
  warnings: ImportIssue[]
  stats: {
    rows: number
    streams: number
    courses: number
    media: number
    links: number
    errors: number
    warnings: number
  }
}

function parseTimestamp(
  raw: string,
  row: number,
  column: string,
  warnings: ImportIssue[],
): Date | null {
  const value = raw.trim()
  if (value === '') {
    warnings.push({ row, column, message: 'empty timestamp, database default will be used' })
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    warnings.push({ row, column, message: `unparsable timestamp "${value}"` })
    return null
  }
  return parsed
}

export function buildPlan(rows: DepartmentCsvRow[], snapshot: DbSnapshot): ImportPlan {
  const errors: ImportIssue[] = []
  const warnings: ImportIssue[] = []
  const streams: PlannedStream[] = []
  const seenSourceIds = new Set<string>()
  const seenSlugs = new Set<string>()
  const seenOrders = new Set<number>()
  const imageRefs = new Set<string>()
  const usedCourseSlugs = new Set<string>()
  const snapshotCourseTitles = new Map<string, string>()
  for (const course of snapshot.courses) {
    if (course.slug) snapshotCourseTitles.set(course.slug, course.title)
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const name = (row.Title ?? '').trim()
    if (name === '') {
      errors.push({ row: rowNumber, column: 'Title', message: 'missing Title' })
      return
    }

    const sourceId = (row.ID ?? '').trim()
    if (sourceId === '') {
      errors.push({ row: rowNumber, column: 'ID', message: 'missing ID' })
      return
    }
    if (seenSourceIds.has(sourceId)) {
      errors.push({ row: rowNumber, column: 'ID', message: `duplicate ID "${sourceId}"` })
      return
    }

    let slug = (row.slug ?? '').trim()
    if (slug === '') {
      slug = slugify(name)
      warnings.push({
        row: rowNumber,
        column: 'slug',
        message: `missing slug, derived "${slug}" from Title`,
      })
    }
    if (slug === '') {
      errors.push({ row: rowNumber, column: 'slug', message: 'slug is empty after derivation' })
      return
    }
    if (seenSlugs.has(slug)) {
      errors.push({ row: rowNumber, column: 'slug', message: `duplicate slug "${slug}"` })
      return
    }

    const overviewRaw = (row.Overview ?? '').trim()
    let overview: RichDoc = { nodes: [] }
    let overviewSource: RichDocSource | null = null
    if (overviewRaw === '') {
      warnings.push({ row: rowNumber, column: 'Overview', message: 'empty Overview' })
    } else {
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(overviewRaw)
      } catch (error) {
        errors.push({
          row: rowNumber,
          column: 'Overview',
          message: `invalid JSON: ${(error as Error).message}`,
        })
        return
      }
      const parsed = parseWixRichText(parsedJson)
      overview = parsed.doc
      overviewSource =
        typeof parsedJson === 'object' && parsedJson !== null && !Array.isArray(parsedJson)
          ? (parsedJson as RichDocSource)
          : null
      for (const issue of parsed.issues) {
        warnings.push({ row: rowNumber, column: 'Overview', message: issue.message })
      }
      if (parsed.doc.nodes.length === 0) {
        warnings.push({ row: rowNumber, column: 'Overview', message: 'no convertible content' })
      }
    }

    const activeRaw = (row.is_active ?? '').trim().toLowerCase()
    let isActive = true
    if (activeRaw === 'false') {
      isActive = false
    } else if (activeRaw === 'true') {
      isActive = true
    } else {
      warnings.push({
        row: rowNumber,
        column: 'is_active',
        message:
          activeRaw === ''
            ? 'empty is_active, defaulted to true'
            : `unrecognized is_active "${activeRaw}", defaulted to true`,
      })
    }

    const orderRaw = (row.display_order ?? '').trim()
    const parsedOrder = Number.parseInt(orderRaw, 10)
    let sortOrder = 0
    if (Number.isFinite(parsedOrder)) {
      sortOrder = parsedOrder
      if (seenOrders.has(sortOrder)) {
        warnings.push({
          row: rowNumber,
          column: 'display_order',
          message: `duplicate display_order ${sortOrder}`,
        })
      }
      seenOrders.add(sortOrder)
    } else {
      warnings.push({
        row: rowNumber,
        column: 'display_order',
        message: `unparsable display_order "${orderRaw}", defaulted to 0`,
      })
    }

    const programmesRaw = (row.programmes ?? '').trim()
    const declaredLevels = parseLevelTokens(programmesRaw)
    if (programmesRaw === '') {
      warnings.push({ row: rowNumber, column: 'programmes', message: 'empty programmes' })
    }
    if (declaredLevels.unknown.length > 0) {
      warnings.push({
        row: rowNumber,
        column: 'programmes',
        message: `unrecognized level token(s): ${declaredLevels.unknown.join(', ')}`,
      })
    }

    const programsHtml = row['Programs offered'] ?? ''
    const programTitles = parseProgramsOffered(programsHtml)
    const courses: PlannedCourse[] = []
    const levelCodes = [...declaredLevels.codes]
    programTitles.forEach((programTitle, programIndex) => {
      const programLevels = parseLevelTokens(programTitle)
      if (programLevels.unknown.length > 0) {
        warnings.push({
          row: rowNumber,
          column: 'Programs offered',
          message: `unrecognized level token(s) in "${programTitle}": ${programLevels.unknown.join(', ')}`,
        })
      }
      const levelCode = programLevels.codes[0] ?? null
      if (levelCode === null) {
        warnings.push({
          row: rowNumber,
          column: 'Programs offered',
          message: `no degree level detected for "${programTitle}"`,
        })
      }
      for (const code of programLevels.codes) {
        if (!levelCodes.includes(code)) levelCodes.push(code)
      }

      let courseSlug = slugify(programTitle)
      if (courseSlug === '') {
        courseSlug = `course-${rowNumber}-${programIndex + 1}`
      }
      let suffix = 2
      const baseSlug = courseSlug
      while (usedCourseSlugs.has(courseSlug)) {
        courseSlug = `${baseSlug}-${suffix}`
        suffix += 1
      }
      usedCourseSlugs.add(courseSlug)

      const existingTitle = snapshotCourseTitles.get(courseSlug)
      if (existingTitle !== undefined && existingTitle !== programTitle) {
        warnings.push({
          row: rowNumber,
          column: 'Programs offered',
          message: `course slug "${courseSlug}" already belongs to "${existingTitle}", it will be updated`,
        })
      }

      courses.push({
        title: programTitle,
        slug: courseSlug,
        levelCode,
        sortOrder: (programIndex + 1) * 10,
      })
    })

    const imageRef = (row['icon image'] ?? '').trim()
    if (imageRef === '') {
      warnings.push({ row: rowNumber, column: 'icon image', message: 'no icon image reference' })
    } else {
      imageRefs.add(imageRef)
    }

    const category = (row.menu_group ?? '').trim()
    if (category === '') {
      warnings.push({ row: rowNumber, column: 'menu_group', message: 'empty menu_group' })
    }

    streams.push({
      sourceId,
      sourcePath: (row['Departments (Item)'] ?? '').trim(),
      sourceOwner: (row.Owner ?? '').trim(),
      slug,
      name,
      tagline: (row.tagline ?? '').trim(),
      shortDescription: (row.description ?? '').trim(),
      category,
      iconSvg: (row.Icon_svg ?? '').trim(),
      sortOrder,
      isActive,
      createdAt: parseTimestamp(row['Created Date'] ?? '', rowNumber, 'Created Date', warnings),
      updatedAt: parseTimestamp(row['Updated Date'] ?? '', rowNumber, 'Updated Date', warnings),
      imageRef: imageRef === '' ? null : imageRef,
      overview,
      overviewSource,
      programsHtml,
      levelCodes,
      courses,
    })

    seenSourceIds.add(sourceId)
    seenSlugs.add(slug)
  })

  const snapshotStreamsBySlug = new Map(snapshot.streams.map((stream) => [stream.slug, stream]))
  for (const stream of streams) {
    const clash = snapshotStreamsBySlug.get(stream.slug)
    if (clash && clash.sourceId !== null && clash.sourceId !== stream.sourceId) {
      errors.push({
        row: null,
        column: 'slug',
        message: `slug "${stream.slug}" already belongs to a different source (existing ID "${clash.sourceId}", incoming "${stream.sourceId}")`,
      })
    }
  }

  const knownCodes = new Set<string>(DEGREE_LEVELS.map((level) => level.code))
  const degreeLevelCodes = DEGREE_LEVELS.map((level) => level.code).filter((code) =>
    streams.some((stream) => stream.levelCodes.includes(code)),
  )
  for (const stream of streams) {
    for (const code of stream.levelCodes) {
      if (!knownCodes.has(code)) {
        errors.push({
          row: null,
          column: 'programmes',
          message: `stream "${stream.slug}" references unknown degree level "${code}"`,
        })
      }
    }
  }

  const courseCount = streams.reduce((total, stream) => total + stream.courses.length, 0)
  const linkCount = streams.reduce((total, stream) => total + stream.levelCodes.length, 0)

  return {
    degreeLevelCodes,
    streams,
    errors,
    warnings,
    stats: {
      rows: rows.length,
      streams: streams.length,
      courses: courseCount,
      media: imageRefs.size,
      links: linkCount,
      errors: errors.length,
      warnings: warnings.length,
    },
  }
}
