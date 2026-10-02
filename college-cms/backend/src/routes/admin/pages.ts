import { Router } from 'express'
import * as pageController from '../../controllers/pageController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.get('/', pageController.adminList)
router.get('/:id', pageController.adminGet)
router.post('/', pageController.adminCreate)
router.put('/:id', pageController.adminUpdate)
router.put('/:id/blocks/order', pageController.adminReorderBlocks)
router.post('/:id/blocks', pageController.adminAddBlock)
router.put('/:id/blocks/:blockId', pageController.adminUpdateBlock)
router.post('/:id/publish', pageController.adminPublish)
router.delete('/:id/blocks/:blockId', pageController.adminRemoveBlock)
router.delete('/:id', requireRole('admin'), pageController.adminRemove)

export default router
