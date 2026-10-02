import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { courses, excellence, facultyMembers, media, pages, streams } from '../db/schema.js'

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

export async function getStats(): Promise<AdminStats> {
  const [
    [pageCount],
    [pagesPublished],
    [pagesDraft],
    [courseCount],
    [coursesActive],
    [streamCount],
    [streamsActive],
    [facultyCount],
    [excellenceCount],
    [mediaCount],
  ] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(pages),
    db.select({ value: sql<number>`count(*)::int` }).from(pages).where(sql`${pages.published} = true`),
    db.select({ value: sql<number>`count(*)::int` }).from(pages).where(sql`${pages.published} = false`),
    db.select({ value: sql<number>`count(*)::int` }).from(courses),
    db.select({ value: sql<number>`count(*)::int` }).from(courses).where(sql`${courses.isActive} = true`),
    db.select({ value: sql<number>`count(*)::int` }).from(streams),
    db.select({ value: sql<number>`count(*)::int` }).from(streams).where(sql`${streams.isActive} = true`),
    db.select({ value: sql<number>`count(*)::int` }).from(facultyMembers),
    db.select({ value: sql<number>`count(*)::int` }).from(excellence),
    db.select({ value: sql<number>`count(*)::int` }).from(media),
  ])
  return {
    pages: pageCount.value,
    pagesPublished: pagesPublished.value,
    pagesDraft: pagesDraft.value,
    courses: courseCount.value,
    coursesActive: coursesActive.value,
    streams: streamCount.value,
    streamsActive: streamsActive.value,
    faculty: facultyCount.value,
    excellence: excellenceCount.value,
    media: mediaCount.value,
  }
}
