import { Children, type CSSProperties, type ReactNode } from 'react'
import { useInView } from '../hooks/useInView'
export default function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useInView<HTMLDivElement>()
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>
}
export function RevealGrid({ children }: { children: ReactNode }) {
  const ref = useInView<HTMLUListElement>()
  return <ul ref={ref} className="card-grid reveal-stagger">{Children.toArray(children).map((child, index) => <li key={index} style={{ '--i': Math.min(index, 7) } as CSSProperties}>{child}</li>)}</ul>
}
