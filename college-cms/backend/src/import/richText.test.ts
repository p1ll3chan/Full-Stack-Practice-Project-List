import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseWixRichText, richTextToPlain } from './richText.js'

function paragraph(text: string, decorations: unknown[] = []): Record<string, unknown> {
  return {
    type: 'PARAGRAPH',
    paragraphData: { textStyle: { textAlignment: 'AUTO' } },
    nodes: [{ type: 'TEXT', textData: { text, decorations }, nodes: [] }],
  }
}

describe('parseWixRichText', () => {
  test('converts paragraph runs and alignment', () => {
    const { doc, issues } = parseWixRichText({
      documentStyle: {},
      nodes: [
        {
          type: 'PARAGRAPH',
          paragraphData: { textStyle: { textAlignment: 'JUSTIFY' } },
          nodes: [
            { type: 'TEXT', textData: { text: 'The department ' }, nodes: [] },
            {
              type: 'TEXT',
              textData: {
                text: 'offers courses',
                decorations: [
                  { type: 'BOLD', fontWeightValue: 700 },
                  { type: 'UNDERLINE' },
                ],
              },
              nodes: [],
            },
          ],
        },
      ],
    })
    assert.deepEqual(issues, [])
    assert.deepEqual(doc, {
      nodes: [
        {
          type: 'paragraph',
          align: 'justify',
          runs: [{ text: 'The department ' }, { text: 'offers courses', bold: true, underline: true }],
        },
      ],
    })
  })

  test('keeps empty paragraphs as spacing', () => {
    const { doc, issues } = parseWixRichText({ nodes: [paragraph('')] })
    assert.deepEqual(issues, [])
    assert.equal(doc.nodes.length, 1)
    assert.deepEqual(doc.nodes[0], { type: 'paragraph', align: 'auto', runs: [{ text: '' }] })
  })

  test('converts headings with level and alignment', () => {
    const { doc } = parseWixRichText({
      nodes: [
        {
          type: 'HEADING',
          headingData: { level: 4, textStyle: { textAlignment: 'CENTER' } },
          nodes: [{ type: 'TEXT', textData: { text: 'Research' }, nodes: [] }],
        },
      ],
    })
    assert.deepEqual(doc.nodes[0], {
      type: 'heading',
      level: 4,
      align: 'center',
      runs: [{ text: 'Research' }],
    })
  })

  test('clamps out of range heading levels', () => {
    const { doc } = parseWixRichText({
      nodes: [{ type: 'HEADING', headingData: { level: 9 }, nodes: [] }],
    })
    assert.equal(doc.nodes[0].type, 'heading')
    assert.equal(doc.nodes[0].type === 'heading' && doc.nodes[0].level, 6)
  })

  test('converts bulleted lists into items', () => {
    const { doc, issues } = parseWixRichText({
      nodes: [
        {
          type: 'BULLETED_LIST',
          bulletedListData: { indentation: 0 },
          nodes: [
            {
              type: 'LIST_ITEM',
              nodes: [
                {
                  type: 'PARAGRAPH',
                  paragraphData: {},
                  nodes: [{ type: 'TEXT', textData: { text: 'B.Sc. Botany' }, nodes: [] }],
                },
              ],
            },
            {
              type: 'LIST_ITEM',
              nodes: [
                {
                  type: 'PARAGRAPH',
                  paragraphData: {},
                  nodes: [
                    { type: 'TEXT', textData: { text: 'M.Sc. ' }, nodes: [] },
                    { type: 'TEXT', textData: { text: 'Botany', decorations: [{ type: 'BOLD' }] }, nodes: [] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    assert.deepEqual(issues, [])
    assert.deepEqual(doc.nodes[0], {
      type: 'list',
      ordered: false,
      items: [[{ text: 'B.Sc. Botany' }], [{ text: 'M.Sc. ' }, { text: 'Botany', bold: true }]],
    })
  })

  test('maps color and link decorations', () => {
    const { doc, issues } = parseWixRichText({
      nodes: [
        paragraph('styled', [
          {
            type: 'COLOR',
            colorData: { foreground: 'rgb(26, 14, 14)', background: 'rgb(253, 249, 244)' },
          },
          {
            type: 'LINK',
            linkData: { link: { url: 'https://example.com', target: 'BLANK' } },
          },
        ]),
      ],
    })
    assert.deepEqual(issues, [])
    assert.deepEqual(doc.nodes[0], {
      type: 'paragraph',
      align: 'auto',
      runs: [
        {
          text: 'styled',
          foreground: 'rgb(26, 14, 14)',
          background: 'rgb(253, 249, 244)',
          href: 'https://example.com',
          target: '_blank',
        },
      ],
    })
  })

  test('reports unsupported node and decoration types', () => {
    const { doc, issues } = parseWixRichText({
      nodes: [
        { type: 'VIDEO', videoData: { src: 'x' } },
        paragraph('kept', [{ type: 'ANCHOR' }]),
      ],
    })
    assert.deepEqual(doc.nodes, [
      { type: 'paragraph', align: 'auto', runs: [{ text: 'kept' }] },
    ])
    assert.deepEqual(
      issues.map((issue) => issue.kind),
      ['unsupported-node', 'unsupported-decoration'],
    )
  })

  test('reports invalid JSON strings', () => {
    const { doc, issues } = parseWixRichText('{not json')
    assert.deepEqual(doc, { nodes: [] })
    assert.equal(issues[0].kind, 'invalid-document')
  })

  test('reports documents without a nodes array', () => {
    const { issues } = parseWixRichText({ documentStyle: {} })
    assert.equal(issues[0].kind, 'invalid-document')
  })

  test('treats empty values as an empty document', () => {
    for (const value of [null, undefined, '']) {
      const { doc, issues } = parseWixRichText(value)
      assert.deepEqual(doc, { nodes: [] })
      assert.deepEqual(issues, [])
    }
  })

  test('parses JSON string documents', () => {
    const { doc } = parseWixRichText(JSON.stringify({ nodes: [paragraph('hello')] }))
    assert.equal(doc.nodes.length, 1)
    assert.equal(richTextToPlain(doc), 'hello')
  })

  test('richTextToPlain flattens paragraphs and list items', () => {
    const { doc } = parseWixRichText({
      nodes: [
        paragraph('First'),
        {
          type: 'BULLETED_LIST',
          nodes: [
            {
              type: 'LIST_ITEM',
              nodes: [
                {
                  type: 'PARAGRAPH',
                  nodes: [{ type: 'TEXT', textData: { text: 'Item one' } }],
                },
              ],
            },
          ],
        },
      ],
    })
    assert.equal(richTextToPlain(doc), 'First\nItem one')
  })
})
