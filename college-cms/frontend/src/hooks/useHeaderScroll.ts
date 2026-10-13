import { useEffect, useState } from 'react'

export function useHeaderScroll() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.scrollY > 24)
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return compact
}
