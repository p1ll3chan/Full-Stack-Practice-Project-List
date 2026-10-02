import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PageBlocks from '../components/PageBlocks'
import type { BlockView } from '../api/types'

afterEach(cleanup)

const sample: BlockView[] = [
  { pageId: 1, position: 1, published: true, id: 1, type: 'heading', content: { text: 'Welcome to the college', level: 2 } },
  { pageId: 1, position: 2, published: true, id: 2, type: 'paragraph', content: { text: 'First paragraph from the database.' } },
  { pageId: 1, position: 3, published: true, id: 3, type: 'list', content: { ordered: false, items: ['Arts', 'Science', ''] } },
  {
    pageId: 1,
    position: 4,
    published: true,
    id: 4,
    type: 'image',
    content: { alt: 'Campus photo', caption: 'The main building' },
    media: {
      id: 10,
      url: 'https://example.com/campus.png',
      altText: 'Campus photo',
      fileName: 'campus.png',
      mimeType: 'image/png',
      width: 800,
      height: 600,
    },
  },
  { pageId: 1, position: 5, published: true, id: 5, type: 'gallery', content: { caption: 'Campus gallery' }, items: [{ id: 50, mediaId: 11, caption: 'Lab' }] },
]

describe('block registry', () => {
  it('renders every supported block type', () => {
    render(<PageBlocks blocks={sample} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Welcome to the college' })).toBeTruthy()
    expect(screen.getByText('First paragraph from the database.')).toBeTruthy()
    expect(screen.getByRole('list')).toBeTruthy()
    expect(screen.getByText('Arts')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Campus photo' })).toBeTruthy()
    expect(screen.getByText('The main building')).toBeTruthy()
    expect(screen.getAllByText('Lab').length).toBeGreaterThan(0)
    expect(screen.getByText('Campus gallery')).toBeTruthy()
  })

  it('reflects API content changes on rerender', () => {
    const { rerender } = render(<PageBlocks blocks={[{ pageId: 1, position: 1, published: true, id: 1, type: 'paragraph', content: { text: 'Version A' } }]} />)
    expect(screen.getByText('Version A')).toBeTruthy()

    rerender(<PageBlocks blocks={[{ pageId: 1, position: 1, published: true, id: 1, type: 'paragraph', content: { text: 'Version B' } }]} />)
    expect(screen.queryByText('Version A')).toBeNull()
    expect(screen.getByText('Version B')).toBeTruthy()
  })

  it('renders database text as text and never as HTML', () => {
    const evil = '<script>alert(1)</script><img src=x onerror="alert(2)">'
    const { container } = render(<PageBlocks blocks={[{ pageId: 1, position: 1, published: true, id: 1, type: 'paragraph', content: { text: evil } }]} />)

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.textContent).toContain(evil)
  })

  it('shows a graceful fallback when an image has no media url', () => {
    const { container } = render(
      <PageBlocks blocks={[{ pageId: 1, position: 4, published: true, id: 4, type: 'image', content: { alt: 'Missing', caption: '' }, media: null }]} />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: 'Missing' })).toBeTruthy()
  })

  it('renders nothing for unknown block types', () => {
    const unknown = { id: 99, type: 'callout', content: { text: 'surprise' } } as unknown as BlockView
    const { container } = render(<PageBlocks blocks={[unknown]} />)
    expect(container.textContent).toBe('')
  })

  it('renders rich paragraph content through the safe rich text renderer', () => {
    render(
      <PageBlocks
        blocks={[
          {
            pageId: 1,
            position: 7,
            published: true,
            id: 7,
            type: 'paragraph',
            content: {
              text: 'Rich version',
              rich: {
                nodes: [
                  {
                    type: 'paragraph',
                    align: 'center',
                    runs: [
                      { text: 'Bold ', bold: true },
                      { text: 'link', href: 'https://example.com' },
                    ],
                  },
                ],
              },
            },
          },
        ]}
      />,
    )

    const link = screen.getByRole('link', { name: 'link' })
    expect(link.getAttribute('href')).toBe('https://example.com')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
