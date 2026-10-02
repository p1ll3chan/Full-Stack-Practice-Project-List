import { Router } from 'express'
import * as mediaController from '../../controllers/mediaController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.get('/', mediaController.adminList)
router.get('/:id', mediaController.adminGet)
router.post('/', mediaController.adminCreate)
router.put('/:id', mediaController.adminUpdate)
router.delete('/:id', requireRole('admin'), mediaController.adminRemove)

export default router
