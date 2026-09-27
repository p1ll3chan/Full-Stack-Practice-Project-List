import { asc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { courses, type Course, type NewCourse } from '../db/schema.js'
import { HttpError } from '../middleware/error.js'

export async function listCourses(): Promise<Course[]> {
  return db.select().from(courses).orderBy(asc(courses.code))
}

export async function getCourse(id: number): Promise<Course> {
  const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1)
  if (!course) throw new HttpError(404, `Course ${id} not found`)
  return course
}

export async function createCourse(input: NewCourse): Promise<Course> {
  const [course] = await db.insert(courses).values(input).returning()
  return course
}

export async function updateCourse(id: number, input: Partial<NewCourse>): Promise<Course> {
  await getCourse(id)
  const [course] = await db.update(courses).set(input).where(eq(courses.id, id)).returning()
  return course
}

export async function deleteCourse(id: number): Promise<void> {
  await getCourse(id)
  await db.delete(courses).where(eq(courses.id, id))
}
