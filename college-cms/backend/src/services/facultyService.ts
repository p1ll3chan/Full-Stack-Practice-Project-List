import { asc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  excellence,
  faculty,
  type ExcellenceItem,
  type FacultyMember,
  type NewExcellenceItem,
  type NewFacultyMember,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'

export async function listFaculty(): Promise<FacultyMember[]> {
  return db.select().from(faculty).orderBy(asc(faculty.name))
}

export async function getFaculty(id: number): Promise<FacultyMember> {
  const [member] = await db.select().from(faculty).where(eq(faculty.id, id)).limit(1)
  if (!member) throw new HttpError(404, `Faculty ${id} not found`)
  return member
}

export async function createFaculty(input: NewFacultyMember): Promise<FacultyMember> {
  const [member] = await db.insert(faculty).values(input).returning()
  return member
}

export async function updateFaculty(
  id: number,
  input: Partial<NewFacultyMember>,
): Promise<FacultyMember> {
  await getFaculty(id)
  const [member] = await db.update(faculty).set(input).where(eq(faculty.id, id)).returning()
  return member
}

export async function deleteFaculty(id: number): Promise<void> {
  await getFaculty(id)
  await db.delete(faculty).where(eq(faculty.id, id))
}

export async function listExcellence(): Promise<ExcellenceItem[]> {
  return db.select().from(excellence).orderBy(asc(excellence.year))
}

export async function createExcellence(input: NewExcellenceItem): Promise<ExcellenceItem> {
  const [item] = await db.insert(excellence).values(input).returning()
  return item
}
