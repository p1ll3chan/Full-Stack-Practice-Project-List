import { Router } from 'express'
import * as pageController from '../controllers/pageController.js'

const router = Router()

router.get('/', pageController.list)
router.get('/:slug', pageController.getBySlug)

export default router
