import { Router } from 'express'
import * as streamController from '../../controllers/streamController.js'
import { requireRole } from '../../middleware/auth.js'

const router = Router()

router.put('/order', streamController.adminReorder)
router.get('/', streamController.adminList)
router.get('/:id', streamController.adminGet)
router.post('/', streamController.adminCreate)
router.put('/:id', streamController.adminUpdate)
router.post('/:id/active', streamController.adminSetActive)
router.get('/:id/details', streamController.adminGetDetails)
router.put('/:id/details', streamController.adminPutDetails)
router.put('/:id/degree-levels', streamController.adminPutDegreeLevels)
router.get('/:id/faculty-details', streamController.adminGetFacultyDetails)
router.put('/:id/faculty-details', streamController.adminPutFacultyDetails)
router.delete('/:id', requireRole('admin'), streamController.adminRemove)

export default router
