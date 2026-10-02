import { Router } from 'express'
import * as facultyController from '../../controllers/facultyController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.get('/', facultyController.adminList)
router.get('/:id', facultyController.adminGet)
router.post('/', facultyController.adminCreate)
router.put('/:id', facultyController.adminUpdate)
router.delete('/:id', requireRole('admin'), facultyController.adminRemove)

export default router
