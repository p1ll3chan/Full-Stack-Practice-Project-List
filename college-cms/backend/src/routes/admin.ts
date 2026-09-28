import { Router } from 'express'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { courses, faculty, pages } from '../db/schema.js'

const router = Router()

router.get('/stats', async (_req, res, next) => {
  // const [pageCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pages)
  // const [courseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(courses)
  // const [facultyCount] = await db.select({ count: sql<number>`count(*)::int` }).from(faculty)
  try{
  const [[pageCount], [courseCount], [facultyCount]] = await Promise.all([
  db.select({ count: sql<number>`count(*)::int` }).from(pages),
  db.select({ count: sql<number>`count(*)::int` }).from(courses),
  db.select({ count: sql<number>`count(*)::int` }).from(faculty),
  ])
  res.json({
    pages: pageCount.count,
    courses: courseCount.count,
    faculty: facultyCount.count,
  })
}catch(err){
  next(err)
}
})

export default router
