import { Router } from 'express'
import * as degreeLevelController from '../../controllers/degreeLevelController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.put('/order', degreeLevelController.adminReorder)
router.get('/', degreeLevelController.adminList)
router.get('/:id', degreeLevelController.adminGet)
router.post('/', degreeLevelController.adminCreate)
router.put('/:id', degreeLevelController.adminUpdate)
router.post('/:id/active', degreeLevelController.adminSetActive)
router.delete('/:id', requireRole('admin'), degreeLevelController.adminRemove)

export default router
