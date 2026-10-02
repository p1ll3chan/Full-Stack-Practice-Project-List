import { eq } from 'drizzle-orm'
import * as schema from '../db/schema.js'
import type { db as devDb } from '../db/index.js'
import type { ImportPlan } from './departments.js'
import { DEGREE_LEVELS } from './programs.js'

type Db = typeof devDb
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export interface ApplyResult {
  degreeLevels: { created: number; existing: number }
  media: { created: number; existing: number }
  streams: { created: number; updated: number }
  academicDetails: { created: number; updated: number }
  degreeLevelStreams: { created: number; existing: number }
  courses: { created: number; updated: number }
}

function emptyResult(): ApplyResult {
  return {
    degreeLevels: { created: 0, existing: 0 },
    media: { created: 0, existing: 0 },
    streams: { created: 0, updated: 0 },
    academicDetails: { created: 0, updated: 0 },
    degreeLevelStreams: { created: 0, existing: 0 },
    courses: { created: 0, updated: 0 },
  }
}

export function parseWixImageRef(ref: string): {
  mediaRef: string | null
  fileName: string | null
  width: number | null
  height: number | null
} {
  const match = /^wix:image:\/\/v1\/([^/]+)\/([^#]*)(?:#(.*))?$/.exec(ref)
  if (!match) return { mediaRef: null, fileName: null, width: null, height: null }
  const mediaRef = match[1]
  const path = (match[2] ?? '').trim()
  const fileName = path === '' ? null : path.split('/').pop() ?? null
  const fragment = new URLSearchParams(match[3] ?? '')
  const width = Number.parseInt(fragment.get('originWidth') ?? '', 10)
  const height = Number.parseInt(fragment.get('originHeight') ?? '', 10)
  return {
    mediaRef,
    fileName,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
  }
}

async function applyInside(tx: Tx, plan: ImportPlan): Promise<ApplyResult> {
  const result = emptyResult()

  const levelIdByCode = new Map<string, number>()
  const existingLevels = await tx.select().from(schema.degreeLevels)
  for (const level of existingLevels) levelIdByCode.set(level.code, level.id)
  for (const level of DEGREE_LEVELS) {
    if (!plan.degreeLevelCodes.includes(level.code)) continue
    if (levelIdByCode.has(level.code)) {
      result.degreeLevels.existing += 1
      continue
    }
    const [inserted] = await tx
      .insert(schema.degreeLevels)
      .values({
        code: level.code,
        name: level.name,
        levelGroup: level.levelGroup,
        sortOrder: level.sortOrder,
      })
      .returning()
    levelIdByCode.set(level.code, inserted.id)
    result.degreeLevels.created += 1
  }

  const mediaIdByRef = new Map<string, number>()
  const existingMedia = await tx.select().from(schema.media)
  for (const media of existingMedia) {
    mediaIdByRef.set(`${media.sourceSystem}:${media.sourceRef}`, media.id)
  }
  for (const stream of plan.streams) {
    if (stream.imageRef === null) continue
    const key = `wix:${stream.imageRef}`
    if (mediaIdByRef.has(key)) {
      result.media.existing += 1
      continue
    }
    const parsed = parseWixImageRef(stream.imageRef)
    const [inserted] = await tx
      .insert(schema.media)
      .values({
        sourceSystem: 'wix',
        sourceRef: stream.imageRef,
        url: null,
        fileName: parsed.fileName,
        width: parsed.width,
        height: parsed.height,
        altText: '',
        status: 'referenced',
      })
      .returning()
    mediaIdByRef.set(key, inserted.id)
    result.media.created += 1
  }

  for (const planned of plan.streams) {
    const bySource = await tx
      .select()
      .from(schema.streams)
      .where(eq(schema.streams.sourceId, planned.sourceId))
      .limit(1)
    let current = bySource[0]
    if (!current) {
      const bySlug = await tx
        .select()
        .from(schema.streams)
        .where(eq(schema.streams.slug, planned.slug))
        .limit(1)
      current = bySlug[0]
    }

    const imageMediaId =
      planned.imageRef === null ? null : (mediaIdByRef.get(`wix:${planned.imageRef}`) ?? null)
    const streamValues = {
      sourcePath: planned.sourcePath,
      sourceOwner: planned.sourceOwner,
      slug: planned.slug,
      name: planned.name,
      tagline: planned.tagline,
      shortDescription: planned.shortDescription,
      category: planned.category,
      iconSvg: planned.iconSvg,
      imageMediaId,
      sortOrder: planned.sortOrder,
      isActive: planned.isActive,
      updatedAt: planned.updatedAt ?? new Date(),
    }

    if (current) {
      await tx.update(schema.streams).set(streamValues).where(eq(schema.streams.id, current.id))
      result.streams.updated += 1
    } else {
      const [inserted] = await tx
        .insert(schema.streams)
        .values({
          ...streamValues,
          sourceId: planned.sourceId,
          createdAt: planned.createdAt ?? new Date(),
        })
        .returning()
      current = inserted
      result.streams.created += 1
    }

    const detailValues = {
      overview: planned.overview,
      overviewSource: planned.overviewSource,
      programsHtml: planned.programsHtml,
      updatedAt: new Date(),
    }
    const [existingDetail] = await tx
      .select()
      .from(schema.academicDetails)
      .where(eq(schema.academicDetails.streamId, current.id))
      .limit(1)
    if (existingDetail) {
      await tx
        .update(schema.academicDetails)
        .set(detailValues)
        .where(eq(schema.academicDetails.id, existingDetail.id))
      result.academicDetails.updated += 1
    } else {
      await tx.insert(schema.academicDetails).values({
        streamId: current.id,
        ...detailValues,
        createdAt: planned.createdAt ?? new Date(),
      })
      result.academicDetails.created += 1
    }

    const existingPairs = await tx
      .select({ degreeLevelId: schema.degreeLevelStreams.degreeLevelId })
      .from(schema.degreeLevelStreams)
      .where(eq(schema.degreeLevelStreams.streamId, current.id))
    const existingPairIds = new Set(existingPairs.map((pair) => pair.degreeLevelId))
    for (const code of planned.levelCodes) {
      const degreeLevelId = levelIdByCode.get(code)
      if (degreeLevelId === undefined) continue
      if (existingPairIds.has(degreeLevelId)) {
        result.degreeLevelStreams.existing += 1
        continue
      }
      await tx.insert(schema.degreeLevelStreams).values({
        streamId: current.id,
        degreeLevelId,
      })
      result.degreeLevelStreams.created += 1
    }

    for (const plannedCourse of planned.courses) {
      const degreeLevelId =
        plannedCourse.levelCode === null
          ? null
          : (levelIdByCode.get(plannedCourse.levelCode) ?? null)
      const [existingCourse] = await tx
        .select()
        .from(schema.courses)
        .where(eq(schema.courses.slug, plannedCourse.slug))
        .limit(1)
      if (existingCourse) {
        await tx
          .update(schema.courses)
          .set({
            title: plannedCourse.title,
            streamId: current.id,
            degreeLevelId,
            sortOrder: plannedCourse.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(schema.courses.id, existingCourse.id))
        result.courses.updated += 1
      } else {
        await tx.insert(schema.courses).values({
          title: plannedCourse.title,
          slug: plannedCourse.slug,
          streamId: current.id,
          degreeLevelId,
          sortOrder: plannedCourse.sortOrder,
          credits: null,
          createdAt: planned.createdAt ?? new Date(),
        })
        result.courses.created += 1
      }
    }
  }

  return result
}

export async function applyPlan(db: Db, plan: ImportPlan): Promise<ApplyResult> {
  if (plan.errors.length > 0) {
    throw new Error(
      `refusing to apply import plan with ${plan.errors.length} error(s); run again after fixing the CSV`,
    )
  }
  return db.transaction((tx) => applyInside(tx, plan))
}
