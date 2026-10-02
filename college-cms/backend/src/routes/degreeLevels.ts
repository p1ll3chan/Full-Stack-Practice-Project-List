import { Router } from 'express'
import * as degreeLevelController from '../controllers/degreeLevelController.js'

const router = Router()

router.get('/', degreeLevelController.list)
router.get('/:code', degreeLevelController.getByCode)

export default router
