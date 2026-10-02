export interface ContentEvent {
  entity: string
  action: string
  at: string
}

type Listener = (events: ContentEvent[]) => void

const listeners = new Set<Listener>()
const DEBOUNCE_MS = 300

let source: EventSource | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let queue: ContentEvent[] = []

function flush() {
  timer = null
  const batch = queue
  queue = []
  for (const listener of [...listeners]) listener(batch)
}

function enqueue(event: ContentEvent) {
  queue.push(event)
  if (timer) clearTimeout(timer)
  timer = setTimeout(flush, DEBOUNCE_MS)
}

function connect() {
  if (source || typeof EventSource === 'undefined') return
  source = new EventSource('/api/events')
  source.addEventListener('content', (message) => {
    try {
      enqueue(JSON.parse((message as MessageEvent<string>).data) as ContentEvent)
    } catch {
      // malformed frame, drop it
    }
  })
}

function disconnect() {
  if (!source) return
  source.close()
  source = null
  if (timer) {
    clearTimeout(timer)
    timer = null
    queue = []
  }
}

export function subscribeContentEvents(listener: Listener): () => void {
  listeners.add(listener)
  connect()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) disconnect()
  }
}
