import entrance from '../assets/marygiri-entrance.png'
import { Link } from 'react-router-dom'
import { useContact } from '../api/hooks'
import { usePageTitle } from '../hooks/usePageTitle'

export interface HeroCta {
  to: string
  label: string
  variant: 'primary' | 'secondary'
}

interface HeroProps {
  title: string
  eyebrow?: string
  ctas?: HeroCta[]
}

export default function Hero({ title, eyebrow, ctas = [] }: HeroProps) {
  // the subtitle is the college tagline from the CMS contact record
  const { data: contact } = useContact()
  const subtitle = contact?.tagline || undefined
  usePageTitle(title, subtitle)

  return (
    <>
      <section className="hero bleed">
        <img className="hero-photo" src={entrance} width="780" height="520" fetchPriority="high" alt="Marygiri College entrance and campus" />
        <div className="hero-inner">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {subtitle && <p className="hero-subtitle">{subtitle}</p>}
          {ctas.length > 0 && (
            <div className="hero-actions">
              {ctas.map((cta) => (
                <Link
                  key={cta.to}
                  to={cta.to}
                  className={cta.variant === 'primary' ? 'hero-cta-primary' : 'hero-cta-secondary'}
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="divider-chevron divider-chevron--hero bleed" aria-hidden="true" />
    </>
  )
}
