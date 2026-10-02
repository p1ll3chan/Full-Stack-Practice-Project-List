import { Router } from 'express'
import * as excellenceController from '../../controllers/excellenceController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.put('/order', excellenceController.adminReorder)
router.get('/', excellenceController.adminList)
router.get('/:id', excellenceController.adminGet)
router.post('/', excellenceController.adminCreate)
router.put('/:id', excellenceController.adminUpdate)
router.delete('/:id', requireRole('admin'), excellenceController.adminRemove)

export default router
