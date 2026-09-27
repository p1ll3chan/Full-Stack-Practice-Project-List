import type { Request, Response } from 'express'
import { numParam, param } from '../middleware/params.js'
import * as pageService from '../services/pageService.js'

export async function list(_req: Request, res: Response) {
  res.json(await pageService.listPages())
}

export async function getBySlug(req: Request, res: Response) {
  res.json(await pageService.getPageBySlug(param(req, 'slug')))
}

export async function getById(req: Request, res: Response) {
  res.json(await pageService.getPageById(numParam(req, 'id')))
}

export async function create(req: Request, res: Response) {
  const { title, slug, blocks, published } = req.body
  if (!title || !slug) {
    res.status(400).json({ error: 'title and slug are required' })
    return
  }
  const page = await pageService.createPage({
    title,
    slug,
    blocks: blocks ?? [],
    published: published ?? false,
  })
  res.status(201).json(page)
}

export async function update(req: Request, res: Response) {
  const { title, slug, blocks, published } = req.body
  const page = await pageService.updatePage(numParam(req, 'id'), {
    ...(title !== undefined && { title }),
    ...(slug !== undefined && { slug }),
    ...(blocks !== undefined && { blocks }),
    ...(published !== undefined && { published }),
  })
  res.json(page)
}

export async function remove(req: Request, res: Response) {
  await pageService.deletePage(numParam(req, 'id'))
  res.status(204).end()
}
