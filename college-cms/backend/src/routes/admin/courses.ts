import { Router } from 'express'
import * as courseController from '../../controllers/courseController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.put('/order', courseController.adminReorder)
router.get('/', courseController.adminList)
router.get('/:id', courseController.adminGet)
router.post('/', courseController.adminCreate)
router.put('/:id', courseController.adminUpdate)
router.post('/:id/active', courseController.adminSetActive)
router.delete('/:id', requireRole('admin'), courseController.adminRemove)

export default router
