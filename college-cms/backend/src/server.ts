import 'dotenv/config'
import { app } from './app.js'
import { checkConnection } from './db/index.js'

const port = Number(process.env.PORT) || 4000

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
  checkConnection().then((ok) =>
    console.log(ok ? 'PostgreSQL connected' : 'WARNING: PostgreSQL unreachable'),
  )
})
