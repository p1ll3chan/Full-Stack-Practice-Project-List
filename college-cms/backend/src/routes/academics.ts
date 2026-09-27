import { Router } from 'express'
import * as courseController from '../controllers/courseController.js'

const router = Router()

router.get('/courses', courseController.list)
router.get('/courses/:id', courseController.getById)
router.post('/courses', courseController.create)
router.put('/courses/:id', courseController.update)
router.delete('/courses/:id', courseController.remove)

export default router
