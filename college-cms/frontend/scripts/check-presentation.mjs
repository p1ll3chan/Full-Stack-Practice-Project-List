/** Read-only browser QA. Start Chrome with --remote-debugging-port=9223 first.
 * BASE_URL=http://127.0.0.1:5173 node scripts/check-presentation.mjs
 * No browser/testing package required; output goes to /tmp/marygiri-qa.
 */
import fs from 'node:fs/promises'
const base = process.env.BASE_URL || 'http://127.0.0.1:5173'
const output = '/tmp/marygiri-qa'
await fs.mkdir(output, { recursive: true })
const targets = await (await fetch('http://127.0.0.1:9223/json')).json()
const target = targets.find(target => target.type === 'page')
if (!target) throw new Error('No browser page available')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
let nextId = 0
const pending = new Map()
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) }
})
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)) }, 20000)
  pending.set(id, message => { clearTimeout(timeout); if (message.error) reject(new Error(message.error.message)); else resolve(message.result) })
  socket.send(JSON.stringify({ id, method, params }))
})
const evaluate = async expression => {
  const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text)
  return response.result?.value
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const waitFor = async expression => { for (let i = 0; i < 60; i++) { if (await evaluate(expression)) return true; await pause(100) } return false }
const results = []
function check(name, pass, detail) { results.push({ name, pass: Boolean(pass), detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`, detail ?? '') }
const key = async (key, code) => {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, text: key === 'Enter' ? '\r' : undefined })
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code })
  await pause(100)
}
const navigate = async path => {
  await call('Page.navigate', { url: base + path })
  for (let i = 0; i < 60; i++) {
    await pause(100)
    if (await evaluate(`document.querySelector('h1') && !document.querySelector('.cms-loading') && !document.querySelector('.card-grid-loading')`)) break
  }
  await pause(300)
}
const screenshot = async name => {
  const { data } = await call('Page.captureScreenshot', { format: 'png' })
  await fs.writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64'))
}
try {
  await call('Page.enable')
  await call('Emulation.setCPUThrottlingRate', { rate: 1 })
  await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await call('Emulation.setEmulatedMedia', { features: [] })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `window.__shifts=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__shifts.push(e.value)}).observe({type:'layout-shift',buffered:true});` })
  for (const route of ['/', '/departments', '/academics', '/faculty', '/excellence']) {
    await navigate(route)
    for (const width of [360, 390, 768, 1024, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
      await pause(200)
      check(`No horizontal overflow: ${width}px ${route}`, await evaluate('document.documentElement.scrollWidth <= innerWidth'))
      if (route === '/') {
        check(`Entrance photo: ${width}px`, await evaluate(`document.querySelector('.hero-photo')?.naturalWidth > 0`))
        if ([390, 1440].includes(width)) await screenshot(`home-${width}`)
      }
    }
  }
  await navigate('/')
  await evaluate(`document.querySelector('.nav-academics').focus()`)
  await key('Enter', 13)
  check('Keyboard opens academic menu', await evaluate(`document.querySelector('.nav-academics').getAttribute('aria-expanded') === 'true'`))
  await waitFor(`!!document.querySelector('[data-category]')`)
  await screenshot('academic-menu')
  await evaluate(`document.querySelector('[data-category]').focus()`)
  await key('ArrowDown', 40); await waitFor(`!!document.querySelector('.mega-courses')`); await key('ArrowRight', 39)
  check('Menu arrows reach courses', await evaluate(`!!document.activeElement.closest('.mega-courses')`))
  await key('Escape', 27)
  check('Escape closes menu and restores focus', await evaluate(`document.activeElement.matches('.nav-academics') && !document.querySelector('.mega-panel')`))
  await evaluate(`document.querySelector('[role=tab]').focus()`)
  await key('ArrowRight', 39)
  check('Keyboard selects program tab', await evaluate(`document.activeElement.matches('[role=tab][aria-selected=true]') && document.activeElement.textContent !== 'All programs'`))
  await evaluate(`document.querySelector('.department-rail').focus()`)
  const left = await evaluate(`document.querySelector('.department-rail').scrollLeft`)
  await key('ArrowRight', 39)
  check('Keyboard scrolls carousel', await evaluate(`document.querySelector('.department-rail').scrollLeft > ${left}`))
  await pause(300)
  const beforeReveal = await evaluate(`window.__shifts.reduce((a,b)=>a+b,0)`)
  for (const selector of ['.hero-photo', '.program-layout img', '.highlight-layout img', '.excellence-highlight img', '.apply-band img']) {
    await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center'})`); await pause(500)
  }
  const afterReveal = await evaluate(`window.__shifts.reduce((a,b)=>a+b,0)`)
  check('Reveals add no layout shift', afterReveal === beforeReveal, { beforeReveal, afterReveal })
  check('All five Marygiri photos load', await evaluate(`[...document.images].filter(x=>x.src.includes('marygiri-')).length === 5 && [...document.images].every(x=>x.complete && x.naturalWidth>0)`))
  await screenshot('closing-band')
  await navigate('/departments')
  await evaluate(`document.querySelector('.filter-chips button:nth-child(2)').focus()`)
  await key('Enter', 13); await pause(500)
  check('Keyboard activates category filter', await evaluate(`document.querySelector('.filter-chips button:nth-child(2)').getAttribute('aria-pressed') === 'true'`))
  check('Filter has visible focus ring', await evaluate(`getComputedStyle(document.activeElement).outlineStyle !== 'none'`))
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate('/')
  await evaluate(`document.querySelector('.nav-toggle').focus()`); await key('Enter', 13); await pause(500)
  check('Mobile drawer opens and locks scrolling', await evaluate(`document.querySelector('dialog')?.open && document.body.style.overflow === 'hidden'`))
  await screenshot('drawer-390')
  let contained = true
  for (let i = 0; i < 16; i++) { await key('Tab', 9); contained = contained && await evaluate(`!!document.activeElement.closest('dialog')`) }
  check('Mobile drawer contains keyboard focus', contained)
  await evaluate(`document.querySelector('dialog [data-category]').focus()`); await key('Enter', 13); await waitFor(`!!document.querySelector('dialog .mega-courses')`)
  check('Keyboard opens mobile accordion', await evaluate(`document.querySelector('dialog [data-category]').getAttribute('aria-expanded') === 'true' && !!document.querySelector('dialog .mega-courses')`))
  await key('Escape', 27); await pause(100)
  check('Drawer Escape restores focus and body scrolling', await evaluate(`!document.querySelector('dialog') && document.body.style.overflow === '' && document.activeElement.matches('.nav-toggle')`))
  const tap = async selector => {
    const rect = await evaluate(`document.querySelector('${selector}').getBoundingClientRect().toJSON()`)
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pause(300)
  }
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await evaluate('scrollTo(0,0)'); await pause(300); await tap('.nav-toggle')
  check('Touch opens drawer', await evaluate(`document.querySelector('dialog')?.open`))
  await tap('.drawer-close')
  check('Touch closes drawer', await evaluate(`!document.querySelector('dialog')`))
  await evaluate(`document.querySelector('.department-rail').scrollIntoView({block:'center',behavior:'instant'})`); await pause(500)
  const railRect = await evaluate(`document.querySelector('.department-rail').getBoundingClientRect().toJSON()`)
  const beforeTouch = await evaluate(`document.querySelector('.department-rail').scrollLeft`)
  const start = { x: Math.round(railRect.x + railRect.width * .85), y: Math.round(Math.max(120, Math.min(700, railRect.y + railRect.height / 2))) }
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  for (let step = 1; step <= 12; step++) {
    await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - step * 20, y: start.y }] })
    await pause(25)
  }
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pause(700)
  check('Touch swipes carousel', await evaluate(`document.querySelector('.department-rail').scrollLeft !== ${beforeTouch}`), { beforeTouch, afterTouch: await evaluate(`document.querySelector('.department-rail').scrollLeft`), railRect })
  await call('Emulation.setTouchEmulationEnabled', { enabled: false })
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await navigate('/')
  check('Reduced motion content visible without transforms', await evaluate(`[...document.querySelectorAll('.reveal')].every(x=>getComputedStyle(x).opacity === '1' && getComputedStyle(x).transform === 'none')`))
  check('Reduced motion hero is static', await evaluate(`getComputedStyle(document.querySelector('.hero'),'::after').animationName === 'none'`))
  await call('Emulation.setEmulatedMedia', { features: [] })
} finally {
  await fs.writeFile(`${output}/results.json`, JSON.stringify({ base, browser: await call('Browser.getVersion'), results }, null, 2))
  socket.close()
}
if (results.some(result => !result.pass)) process.exitCode = 1
