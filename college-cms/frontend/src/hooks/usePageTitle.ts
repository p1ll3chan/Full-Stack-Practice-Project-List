import { useEffect } from 'react'

const SITE_NAME = 'College CMS'

export function usePageTitle(title?: string, description?: string) {
  useEffect(() => {
    document.title = title && title !== SITE_NAME ? `${title} | ${SITE_NAME}` : SITE_NAME
    if (description) {
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', description)
    }
  }, [title, description])
}
