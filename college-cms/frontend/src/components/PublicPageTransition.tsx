import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** Animate public presentation after navigation; never intercept or change routing. */
export default function PublicPageTransition() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    const main = document.getElementById('main')
    const admin = pathname === '/admin' || pathname.startsWith('/admin/')
    main?.classList.toggle('public-main', !admin)
    const changed = previous.current !== pathname
    previous.current = pathname
    if (!main || admin || !changed) return
    let cancelled = false
    let transition: ViewTransition | undefined
    const focusHeading = () => {
      const heading = main.querySelector<HTMLElement>('h1')
      if (!heading) return false
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      return true
    }
    const observer = new MutationObserver(() => { if (focusHeading()) observer.disconnect() })
    if (!focusHeading()) observer.observe(main, { childList: true, subtree: true })
    const fallback = () => {
      if (cancelled) return
      main.classList.remove('page-fade')
      // Restart a compositor-only CSS fade; dimensions never change.
      void main.offsetWidth
      main.classList.add('page-fade')
    }
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      if (typeof document.startViewTransition === 'function') {
        try {
          main.classList.add('page-snapshot')
          transition = document.startViewTransition(() => { main.dataset.presentationPath = pathname })
          transition.ready.catch(fallback)
          transition.finished.catch(() => {}).finally(() => { if (!cancelled) main.classList.remove('page-snapshot') })
        } catch { main.classList.remove('page-snapshot'); fallback() }
      } else fallback()
    }
    return () => {
      cancelled = true
      observer.disconnect()
      transition?.skipTransition()
      main.classList.remove('page-fade', 'page-snapshot')
    }
  }, [pathname])
  return null
}
