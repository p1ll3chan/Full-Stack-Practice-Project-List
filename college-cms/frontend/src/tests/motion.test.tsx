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

it('reveals focused content even before intersection', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 2000 } as DOMRect)
  const disconnect = vi.fn()
  vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); disconnect = disconnect })
  const { container } = render(<Subject />)
  const element = container.firstElementChild!
  expect(element.hasAttribute('data-reveal-pending')).toBe(true)
  act(() => element.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
  expect(element.hasAttribute('data-reveal-pending')).toBe(false)
  expect(disconnect).toHaveBeenCalled()
})
it('reveals immediately when reduced motion is enabled during the session', () => {
  let change: () => void = () => {}
  const preference = { matches: false, addEventListener: (_: string, callback: () => void) => { change = callback }, removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => preference)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 2000 } as DOMRect)
  vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); disconnect = vi.fn() })
  const { container, unmount } = render(<Subject />)
  expect(container.firstElementChild?.hasAttribute('data-reveal-pending')).toBe(true)
  act(() => { preference.matches = true; change() })
  expect(container.firstElementChild?.hasAttribute('data-reveal-pending')).toBe(false)
  unmount()
  expect(preference.removeEventListener).toHaveBeenCalled()
})
it('keeps content visible if observer registration throws', () => {
  vi.stubGlobal('IntersectionObserver', class { observe() { throw new Error('Unavailable') }; disconnect = vi.fn() })
  const { container } = render(<Subject />)
  expect(container.firstElementChild?.hasAttribute('data-reveal-pending')).toBe(false)
})
