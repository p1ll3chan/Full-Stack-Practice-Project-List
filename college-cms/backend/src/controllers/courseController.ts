import type { Request, Response } from 'express'
import { numParam } from '../middleware/params.js'
import * as courseService from '../services/courseService.js'

export async function list(_req: Request, res: Response) {
  res.json(await courseService.listCourses())
}

export async function getById(req: Request, res: Response) {
  res.json(await courseService.getCourse(numParam(req, 'id')))
}

export async function create(req: Request, res: Response) {
  const { code, title, description, credits, department } = req.body
  if (!code || !title) {
    res.status(400).json({ error: 'code and title are required' })
    return
  }
  const course = await courseService.createCourse({
    code,
    title,
    description: description ?? '',
    credits: credits ?? 3,
    department: department ?? '',
  })
  res.status(201).json(course)
}

export async function update(req: Request, res: Response) {
  const { code, title, description, credits, department } = req.body
  const course = await courseService.updateCourse(numParam(req, 'id'), {
    ...(code !== undefined && { code }),
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(credits !== undefined && { credits }),
    ...(department !== undefined && { department }),
  })
  res.json(course)
}

export async function remove(req: Request, res: Response) {
  await courseService.deleteCourse(numParam(req, 'id'))
  res.status(204).end()
}
