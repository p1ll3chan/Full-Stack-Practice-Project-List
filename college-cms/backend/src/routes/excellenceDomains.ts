import { Router } from 'express'
import * as excellenceDomainController from '../controllers/excellenceDomainController.js'

const router = Router()

router.get('/', excellenceDomainController.list)
router.get('/:slug', excellenceDomainController.getBySlug)

export default router
