import { Router } from 'express'
import * as facultyController from '../controllers/facultyController.js'

const router = Router()

router.get('/', facultyController.listExcellence)
router.post('/', facultyController.createExcellence)

export default router
