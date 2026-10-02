import { Router } from 'express'
import * as excellenceController from '../controllers/excellenceController.js'

const router = Router()

router.get('/', excellenceController.list)
router.get('/:id', excellenceController.getById)

export default router
