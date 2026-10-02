import { useState } from 'react'

export interface MediaLike {
  url: string | null
  altText: string
  width?: number | null
  height?: number | null
}

interface MediaImageProps {
  media?: MediaLike | null
  alt?: string
  className?: string
}

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed
  return null
}

export default function MediaImage({ media, alt, className }: MediaImageProps) {
  const [failed, setFailed] = useState(false)
  const url = safeUrl(media?.url)
  const label = alt ?? media?.altText ?? ''
  const classes = ['media-frame', className].filter(Boolean).join(' ')

  if (!url || failed) {
    return (
      <div className={`${classes} media-fallback`} role="img" aria-label={label || 'Image unavailable'}>
        <span aria-hidden="true">◫</span>
        <small>{label || 'No image'}</small>
      </div>
    )
  }

  return (
    <img
      className={classes}
      src={url}
      alt={label}
      width={media?.width ?? undefined}
      height={media?.height ?? undefined}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
