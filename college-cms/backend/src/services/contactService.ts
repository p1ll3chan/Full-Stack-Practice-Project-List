import { db } from '../db/index.js'
import { collegeContact, type CollegeContact, type NewCollegeContact } from '../db/schema.js'
import { HttpError } from '../middleware/error.js'

export async function getContact(): Promise<CollegeContact> {
  const [row] = await db.select().from(collegeContact).limit(1)
  if (!row) throw new HttpError(404, 'Contact information has not been configured', 'not_found')
  return row
}

export async function upsertContact(input: Partial<NewCollegeContact>): Promise<CollegeContact> {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined)
  if (entries.length === 0) {
    const [existing] = await db.select().from(collegeContact).limit(1)
    if (existing) return existing
    const [created] = await db.insert(collegeContact).values({ id: 1 }).returning()
    return created
  }
  const payload = Object.fromEntries(entries) as Partial<NewCollegeContact>
  const [row] = await db
    .insert(collegeContact)
    .values({ id: 1, ...payload })
    .onConflictDoUpdate({ target: collegeContact.id, set: payload })
    .returning()
  return row
}
