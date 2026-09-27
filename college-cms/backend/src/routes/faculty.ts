import { Router } from 'express'
import * as facultyController from '../controllers/facultyController.js'

const router = Router()

router.get('/', facultyController.list)
router.get('/:id', facultyController.getById)
router.post('/', facultyController.create)
router.put('/:id', facultyController.update)
router.delete('/:id', facultyController.remove)

export default router
