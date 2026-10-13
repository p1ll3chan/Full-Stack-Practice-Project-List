import { act, cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useInView } from '../hooks/useInView'
import { useHeaderScroll } from '../hooks/useHeaderScroll'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function Subject() { const ref = useInView<HTMLDivElement>(); return <div ref={ref}>Content</div> }
it('keeps content visible without IntersectionObserver', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const { container } = render(<Subject />)
  expect(container.firstElementChild?.hasAttribute('data-reveal-pending')).toBe(false)
})
it('observes offscreen content once and disconnects on reveal and cleanup', () => {
  let notify: IntersectionObserverCallback = () => {}
  const disconnect = vi.fn()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 2000 } as DOMRect)
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback }
    observe = vi.fn()
    disconnect = disconnect
  })
  const { container, unmount } = render(<Subject />)
  expect(container.firstElementChild?.hasAttribute('data-reveal-pending')).toBe(true)
  act(() => notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
  expect(container.firstElementChild?.hasAttribute('data-reveal-pending')).toBe(false)
  expect(disconnect).toHaveBeenCalled()
  unmount()
  expect(disconnect.mock.calls.length).toBeGreaterThan(1)
})
it('does not hide content under reduced motion', () => {
  const observer = vi.fn()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal('IntersectionObserver', observer)
  const { container } = render(<Subject />)
  expect(container.firstElementChild?.hasAttribute('data-reveal-pending')).toBe(false)
  expect(observer).not.toHaveBeenCalled()
})
it('tracks the 24px boundary and removes its listener', () => {
  vi.stubGlobal('scrollY', 0)
  const remove = vi.spyOn(window, 'removeEventListener')
  const { result, unmount } = renderHook(useHeaderScroll)
  expect(result.current).toBe(false)
  act(() => { vi.stubGlobal('scrollY', 24); window.dispatchEvent(new Event('scroll')) })
  expect(result.current).toBe(false)
  act(() => { vi.stubGlobal('scrollY', 25); window.dispatchEvent(new Event('scroll')) })
  expect(result.current).toBe(true)
  act(() => { vi.stubGlobal('scrollY', 0); window.dispatchEvent(new Event('scroll')) })
  expect(result.current).toBe(false)
  unmount()
  expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
})
