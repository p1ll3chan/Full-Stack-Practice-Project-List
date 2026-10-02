import { Router } from 'express'
import * as academicController from '../controllers/academicController.js'
import * as courseController from '../controllers/courseController.js'

const router = Router()

router.get('/courses', courseController.list)
router.get('/courses/:id', courseController.getById)
router.get('/details/:streamSlug', academicController.getByStreamSlug)

export default router
