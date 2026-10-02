import { Router } from 'express'
import * as adminController from '../../controllers/adminController.js'
import contactRouter from './contact.js'
import coursesRouter from './courses.js'
import degreeLevelsRouter from './degreeLevels.js'
import excellenceDomainsRouter from './excellenceDomains.js'
import excellenceRouter from './excellence.js'
import facultyRouter from './faculty.js'
import mediaRouter from './media.js'
import pagesRouter from './pages.js'
import streamsRouter from './streams.js'

const router = Router()

router.get('/whoami', adminController.whoami)
router.get('/stats', adminController.stats)
router.use('/excellence-domains', excellenceDomainsRouter)
router.use('/excellence', excellenceRouter)
router.use('/degree-levels', degreeLevelsRouter)
router.use('/pages', pagesRouter)
router.use('/streams', streamsRouter)
router.use('/courses', coursesRouter)
router.use('/faculty', facultyRouter)
router.use('/media', mediaRouter)
router.use('/contact', contactRouter)

export default router
