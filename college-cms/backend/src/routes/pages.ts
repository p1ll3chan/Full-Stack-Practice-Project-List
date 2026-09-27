import { Router } from 'express'
import * as pageController from '../controllers/pageController.js'

const router = Router()

router.get('/', pageController.list)
router.get('/:slug', pageController.getBySlug)
router.get('/id/:id', pageController.getById)
router.post('/', pageController.create)
router.put('/:id', pageController.update)
router.delete('/:id', pageController.remove)

export default router
