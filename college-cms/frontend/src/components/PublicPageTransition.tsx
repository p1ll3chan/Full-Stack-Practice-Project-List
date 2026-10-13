import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** Animate the public presentation after navigation; never intercept or change routing. */
export default function PublicPageTransition() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    const main = document.getElementById('main')
    const admin = pathname === '/admin' || pathname.startsWith('/admin/')
    main?.classList.toggle('public-main', !admin)
    const changed = previous.current !== pathname
    previous.current = pathname
    if (!main || admin || !changed || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const fallback = () => {
      main.classList.remove('page-fade')
      // Restart the CSS fade only; layout dimensions never change.
      void main.offsetWidth
      main.classList.add('page-fade')
    }
    let transition: ViewTransition | undefined
    if (typeof document.startViewTransition === 'function') {
      try {
        main.classList.add('page-snapshot')
        transition = document.startViewTransition(() => { main.dataset.presentationPath = pathname })
        transition.finished.catch(fallback).finally(() => main.classList.remove('page-snapshot'))
      } catch { main.classList.remove('page-snapshot'); fallback() }
    } else fallback()
    return () => { transition?.skipTransition(); main.classList.remove('page-fade', 'page-snapshot') }
  }, [pathname])
  return null
}
