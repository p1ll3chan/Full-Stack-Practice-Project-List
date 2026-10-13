import { useEffect, useRef } from 'react'

/** Visible by default; only arm a reveal after successfully observing offscreen content. */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let observer: IntersectionObserver | undefined
    const show = () => {
      element.removeAttribute('data-reveal-pending')
      element.setAttribute('data-reveal-done', '')
      observer?.disconnect()
    }
    if (preference?.matches) return
    try {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show()
      }, { threshold: 0 })
      observer.observe(element)
      if (element.getBoundingClientRect().top >= window.innerHeight) {
        element.setAttribute('data-reveal-pending', '')
      }
    } catch {
      show()
    }
    const onPreference = () => { if (preference?.matches) show() }
    preference?.addEventListener('change', onPreference)
    element.addEventListener('focusin', show)
    return () => {
      observer?.disconnect()
      element.removeAttribute('data-reveal-pending')
      preference?.removeEventListener('change', onPreference)
      element.removeEventListener('focusin', show)
    }
  }, [])
  return ref
}
