import { Router } from 'express'
import * as contactController from '../controllers/contactController.js'

const router = Router()

router.get('/', contactController.get)

export default router
