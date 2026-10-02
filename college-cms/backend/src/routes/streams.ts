import { Router } from 'express'
import * as streamController from '../controllers/streamController.js'

const router = Router()

router.get('/', streamController.list)
router.get('/:slug', streamController.getBySlug)

export default router
