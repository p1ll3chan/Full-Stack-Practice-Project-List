import { Router } from 'express'
import * as excellenceDomainController from '../../controllers/excellenceDomainController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.put('/order', excellenceDomainController.adminReorder)
router.get('/', excellenceDomainController.adminList)
router.get('/:id', excellenceDomainController.adminGet)
router.post('/', excellenceDomainController.adminCreate)
router.put('/:id', excellenceDomainController.adminUpdate)
router.post('/:id/active', excellenceDomainController.adminSetActive)
router.delete('/:id', requireRole('admin'), excellenceDomainController.adminRemove)

export default router
