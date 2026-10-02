import type { Response } from 'express'

export interface ContentEvent {
  entity: string
  action: 'mutated'
  at: string
}

interface Client {
  id: number
  res: Response
  heartbeat: NodeJS.Timeout
}

const clients = new Map<number, Client>()
let nextId = 1

const MAX_CLIENTS = Number(process.env.SSE_MAX_CLIENTS ?? 100)
const HEARTBEAT_MS = Number(process.env.SSE_HEARTBEAT_MS ?? 25000)

export function clientCount(): number {
  return clients.size
}

export function publishContentEvent(event: ContentEvent): void {
  const payload = `event: content\ndata: ${JSON.stringify(event)}\n\n`
  for (const client of clients.values()) {
    client.res.write(payload)
  }
}

export function subscribeSse(res: Response): void {
  if (clients.size >= MAX_CLIENTS) {
    res.status(503).json({
      error: { code: 'internal_error', message: 'Too many event connections' },
    })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write(`retry: 3000\n\n`)
  res.write(`event: ready\ndata: {}\n\n`)

  const id = nextId++
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`)
  }, HEARTBEAT_MS)
  clients.set(id, { id, res, heartbeat })

  const cleanup = () => {
    const client = clients.get(id)
    if (client) {
      clearInterval(client.heartbeat)
      clients.delete(id)
    }
  }
  res.on('close', cleanup)
  res.on('error', cleanup)
}

export function closeAllSseClients(): void {
  for (const client of clients.values()) {
    clearInterval(client.heartbeat)
    client.res.end()
  }
  clients.clear()
}
