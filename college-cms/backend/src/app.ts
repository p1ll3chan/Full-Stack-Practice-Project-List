import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { publishContentEvent, subscribeSse } from './events.js'
import { checkConnection } from './db/index.js'
import { ok } from './http/respond.js'
import { authenticate, requireRole } from './middleware/auth.js'
import { errorHandler, notFound } from './middleware/error.js'
import { rateLimit } from './middleware/rateLimit.js'
import { securityHeaders } from './middleware/security.js'
import academicsRouter from './routes/academics.js'
import adminRouter from './routes/admin/index.js'
import contactRouter from './routes/contact.js'
import degreeLevelsRouter from './routes/degreeLevels.js'
import excellenceRouter from './routes/excellence.js'
import excellenceDomainsRouter from './routes/excellenceDomains.js'
import facultyRouter from './routes/faculty.js'
import pagesRouter from './routes/pages.js'
import streamsRouter from './routes/streams.js'

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin !== '')

let openapiDocument: string | undefined

async function serveOpenapi(_req: Request, res: Response, next: NextFunction) {
  try {
    if (openapiDocument === undefined) {
      openapiDocument = await readFile(new URL('../docs/openapi.json', import.meta.url), 'utf8')
    }
    res.type('application/json').send(openapiDocument)
  } catch (error) {
    next(error)
  }
}

function entityFromAdminPath(pathname: string): string {
  const segment = pathname.split('/').filter((part) => part !== '')[0] ?? 'content'
  return segment.replace(/[^a-z0-9-]/gi, '')
}

function emitContentEvent(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    const entity = entityFromAdminPath(req.path)
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        publishContentEvent({
          entity,
          action: 'mutated',
          at: new Date().toISOString(),
        })
      }
    })
  }
  next()
}

export const app = express()

app.disable('x-powered-by')
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : Number(process.env.TRUST_PROXY) || 0)
}
app.use(securityHeaders)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin ?? false)
      } else {
        callback(null, false)
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
)
app.use(express.json({ limit: '1mb' }))

const apiRateLimit = rateLimit('api', 'RATE_LIMIT_MAX', 'RATE_LIMIT_WINDOW_MS', 300, 60000)
const authRateLimit = rateLimit('auth', 'AUTH_RATE_LIMIT_MAX', 'AUTH_RATE_LIMIT_WINDOW_MS', 30, 60000)

app.use('/api', apiRateLimit)

app.get('/api/health', async (_req, res) => {
  const dbUp = await checkConnection()
  ok(res, { status: dbUp ? 'ok' : 'degraded', database: dbUp ? 'connected' : 'unreachable' })
})
app.get('/api/openapi.json', serveOpenapi)
app.get('/api/events', (req: Request, res: Response) => {
  subscribeSse(res)
  req.socket.setTimeout(0)
  req.socket.setKeepAlive(true)
})

app.use('/api/pages', pagesRouter)
app.use('/api/streams', streamsRouter)
app.use('/api/degree-levels', degreeLevelsRouter)
app.use('/api/excellence-domains', excellenceDomainsRouter)
app.use('/api/excellence', excellenceRouter)
app.use('/api/faculty', facultyRouter)
app.use('/api/contact', contactRouter)
app.use('/api/academics', academicsRouter)
app.use('/api/admin', authRateLimit, authenticate, requireRole('editor'), emitContentEvent, adminRouter)

app.use(notFound)
app.use(errorHandler)
