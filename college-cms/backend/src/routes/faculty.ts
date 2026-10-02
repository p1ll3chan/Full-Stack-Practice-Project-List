import { Router } from 'express'
import * as facultyController from '../controllers/facultyController.js'

const router = Router()

router.get('/', facultyController.list)
router.get('/:id', facultyController.getById)

export default router
