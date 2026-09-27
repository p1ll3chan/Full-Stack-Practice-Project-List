import type { Request, Response } from 'express'
import { numParam } from '../middleware/params.js'
import * as facultyService from '../services/facultyService.js'

export async function list(_req: Request, res: Response) {
  res.json(await facultyService.listFaculty())
}

export async function getById(req: Request, res: Response) {
  res.json(await facultyService.getFaculty(numParam(req, 'id')))
}

export async function create(req: Request, res: Response) {
  const { name, title, department, email, bio } = req.body
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const member = await facultyService.createFaculty({
    name,
    title: title ?? '',
    department: department ?? '',
    email: email ?? '',
    bio: bio ?? '',
  })
  res.status(201).json(member)
}

export async function update(req: Request, res: Response) {
  const { name, title, department, email, bio } = req.body
  const member = await facultyService.updateFaculty(numParam(req, 'id'), {
    ...(name !== undefined && { name }),
    ...(title !== undefined && { title }),
    ...(department !== undefined && { department }),
    ...(email !== undefined && { email }),
    ...(bio !== undefined && { bio }),
  })
  res.json(member)
}

export async function remove(req: Request, res: Response) {
  await facultyService.deleteFaculty(numParam(req, 'id'))
  res.status(204).end()
}

export async function listExcellence(_req: Request, res: Response) {
  res.json(await facultyService.listExcellence())
}

export async function createExcellence(req: Request, res: Response) {
  const { title, category, description, year } = req.body
  if (!title || !year) {
    res.status(400).json({ error: 'title and year are required' })
    return
  }
  const item = await facultyService.createExcellence({
    title,
    category: category ?? '',
    description: description ?? '',
    year,
  })
  res.status(201).json(item)
}
