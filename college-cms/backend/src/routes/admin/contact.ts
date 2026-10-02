import { Router } from 'express'
import * as contactController from '../../controllers/contactController.js'

const router = Router()

router.get('/', contactController.adminGet)
router.put('/', contactController.adminPut)

export default router
