import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { checkConnection } from './db/index.js'
import { errorHandler, notFound } from './middleware/error.js'
import academicsRouter from './routes/academics.js'
import adminRouter from './routes/admin.js'
import excellenceRouter from './routes/excellence.js'
import facultyRouter from './routes/faculty.js'
import pagesRouter from './routes/pages.js'

const app = express()
const port = Number(process.env.PORT) || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  const dbUp = await checkConnection()
  res.json({ status: dbUp ? 'ok' : 'degraded', database: dbUp ? 'connected' : 'unreachable' })
})

app.use('/api/pages', pagesRouter)
app.use('/api/academics', academicsRouter)
app.use('/api/faculty', facultyRouter)
app.use('/api/excellence', excellenceRouter)
app.use('/api/admin', adminRouter)

app.use(notFound)
app.use(errorHandler)

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
  checkConnection().then((ok) =>
    console.log(ok ? 'PostgreSQL connected' : 'WARNING: PostgreSQL unreachable'),
  )
})
