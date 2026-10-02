import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DEPARTMENT_CSV_COLUMNS,
  defaultCsvPath,
  readDepartmentsCsv,
  type DepartmentCsvRow,
} from './csv.js'
import { buildPlan, type DbSnapshot } from './departments.js'
import {
  assertDispositionCoversColumns,
  COLUMN_DISPOSITION,
  formatPlanSummary,
} from './report.js'

const EMPTY_SNAPSHOT: DbSnapshot = { streams: [], courses: [], media: [], degreeLevels: [] }

const VALID_OVERVIEW = JSON.stringify({
  nodes: [
    {
      type: 'PARAGRAPH',
      paragraphData: { textStyle: { textAlignment: 'AUTO' } },
      nodes: [{ type: 'TEXT', textData: { text: 'Hello' }, nodes: [] }],
    },
  ],
})

let syntheticId = 0

function makeRow(
  overrides: Partial<Record<(typeof DEPARTMENT_CSV_COLUMNS)[number], string>> = {},
): DepartmentCsvRow {
  syntheticId += 1
  const row: DepartmentCsvRow = {}
  for (const column of DEPARTMENT_CSV_COLUMNS) row[column] = ''
  row.ID = `00000000-0000-0000-0000-${String(syntheticId).padStart(12, '0')}`
  row.Title = `Department of Testing ${syntheticId}`
  row.slug = `department-of-testing-${syntheticId}`
  row.Overview = VALID_OVERVIEW
  row.display_order = String(syntheticId)
  row.is_active = 'true'
  row.menu_group = 'Science'
  row['Programs offered'] = `<ul><li><p>B.Sc. Testing</p></li></ul>`
  return { ...row, ...overrides }
}

describe('Departments.csv import plan', () => {
  const rows = readDepartmentsCsv(defaultCsvPath())

  test('plans every row without errors', () => {
    const plan = buildPlan(rows, EMPTY_SNAPSHOT)
    assert.deepEqual(plan.errors, [])
    assert.equal(plan.stats.rows, 18)
    assert.equal(plan.stats.streams, 18)
    assert.equal(plan.stats.courses, 26)
    assert.equal(plan.stats.media, 17)
    assert.equal(plan.stats.links, 25)
    assert.equal(plan.stats.warnings, 7)
  })

  test('references all eight degree levels', () => {
    const plan = buildPlan(rows, EMPTY_SNAPSHOT)
    assert.deepEqual([...plan.degreeLevelCodes].sort(), [
      'ba',
      'bcom',
      'bsc',
      'bvoc',
      'ma',
      'mcom',
      'msc',
      'phd',
    ])
  })

  test('derives the missing slug and defaults is_active', () => {
    const plan = buildPlan(rows, EMPTY_SNAPSHOT)
    const foodProcessing = plan.streams.find(
      (stream) => stream.sourceId === '0293f2c0-381a-443c-a5b3-606de850c308',
    )
    assert.ok(foodProcessing)
    assert.equal(foodProcessing.slug, 'department-of-food-processing-and-management')
    assert.equal(foodProcessing.isActive, true)
    const messages = plan.warnings
      .filter((warning) => warning.row === 1)
      .map((warning) => `${warning.column}: ${warning.message}`)
    assert.ok(messages.some((message) => message.startsWith('slug:')))
    assert.ok(messages.some((message) => message.startsWith('is_active:')))
  })

  test('preserves the raw overview and stores a normalized document', () => {
    const plan = buildPlan(rows, EMPTY_SNAPSHOT)
    for (const stream of plan.streams) {
      assert.ok(Array.isArray(stream.overview.nodes))
      assert.ok(stream.overview.nodes.length > 0)
      assert.ok(stream.overviewSource !== null)
      assert.equal(typeof stream.overviewSource.nodes, 'object')
    }
    const mathematics = plan.streams.find((stream) => stream.slug === 'department-of-mathematics')
    assert.ok(mathematics)
    assert.ok(mathematics.programsHtml.includes('<ul'))
    assert.deepEqual(
      mathematics.courses.map((course) => course.title),
      ['B.Sc. Mathematics', 'M.Sc. Mathematics'],
    )
    assert.deepEqual(
      mathematics.courses.map((course) => course.levelCode),
      ['bsc', 'msc'],
    )
  })

  test('parses every course level in the real file', () => {
    const plan = buildPlan(rows, EMPTY_SNAPSHOT)
    const withoutLevel = plan.streams
      .flatMap((stream) => stream.courses)
      .filter((course) => course.levelCode === null)
    assert.deepEqual(withoutLevel, [])
  })

  test('is deterministic', () => {
    const first = buildPlan(rows, EMPTY_SNAPSHOT)
    const second = buildPlan(rows, EMPTY_SNAPSHOT)
    assert.equal(JSON.stringify(first), JSON.stringify(second))
  })
})

describe('row validation', () => {
  test('rejects a row without a Title', () => {
    const plan = buildPlan([makeRow({ Title: '', slug: 'x' })], EMPTY_SNAPSHOT)
    assert.equal(plan.streams.length, 0)
    assert.equal(plan.errors.length, 1)
    assert.equal(plan.errors[0].column, 'Title')
  })

  test('rejects a row without an ID', () => {
    const plan = buildPlan([makeRow({ ID: '' })], EMPTY_SNAPSHOT)
    assert.equal(plan.streams.length, 0)
    assert.equal(plan.errors[0].column, 'ID')
  })

  test('rejects duplicate IDs', () => {
    const first = makeRow()
    const second = makeRow({ ID: first.ID, slug: 'other-slug' })
    const plan = buildPlan([first, second], EMPTY_SNAPSHOT)
    assert.equal(plan.streams.length, 1)
    assert.equal(plan.errors.length, 1)
    assert.match(plan.errors[0].message, /duplicate ID/)
  })

  test('rejects duplicate slugs', () => {
    const first = makeRow()
    const second = makeRow({ slug: first.slug, ID: '99999999-9999-9999-9999-999999999999' })
    const plan = buildPlan([first, second], EMPTY_SNAPSHOT)
    assert.equal(plan.streams.length, 1)
    assert.equal(plan.errors.length, 1)
    assert.match(plan.errors[0].message, /duplicate slug/)
  })

  test('rejects invalid Overview JSON', () => {
    const plan = buildPlan([makeRow({ Overview: '{broken' })], EMPTY_SNAPSHOT)
    assert.equal(plan.streams.length, 0)
    assert.equal(plan.errors.length, 1)
    assert.equal(plan.errors[0].column, 'Overview')
  })

  test('warns about unsupported overview content but keeps the row', () => {
    const overview = JSON.stringify({
      nodes: [
        { type: 'PARAGRAPH', paragraphData: {}, nodes: [] },
        { type: 'VIDEO', videoData: { src: 'x' } },
      ],
    })
    const plan = buildPlan([makeRow({ Overview: overview })], EMPTY_SNAPSHOT)
    assert.equal(plan.errors.length, 0)
    assert.equal(plan.streams.length, 1)
    assert.ok(
      plan.warnings.some((warning) => warning.column === 'Overview' && /VIDEO/.test(warning.message)),
    )
  })

  test('rejects a slug that belongs to a different source stream', () => {
    const row = makeRow()
    const snapshot: DbSnapshot = {
      ...EMPTY_SNAPSHOT,
      streams: [{ id: 7, slug: row.slug, sourceId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' }],
    }
    const plan = buildPlan([row], snapshot)
    assert.equal(plan.errors.length, 1)
    assert.match(plan.errors[0].message, /different source/)
  })

  test('applies is_active false and warns on unrecognized values', () => {
    const inactive = buildPlan([makeRow({ is_active: 'false' })], EMPTY_SNAPSHOT)
    assert.equal(inactive.streams[0].isActive, false)
    const bogus = buildPlan([makeRow({ is_active: 'maybe' })], EMPTY_SNAPSHOT)
    assert.equal(bogus.streams[0].isActive, true)
    assert.ok(bogus.warnings.some((warning) => warning.column === 'is_active'))
  })

  test('warns when a course has no detectable degree level', () => {
    const plan = buildPlan(
      [makeRow({ 'Programs offered': '<ul><li><p>Diploma of Testing</p></li></ul>' })],
      EMPTY_SNAPSHOT,
    )
    assert.equal(plan.errors.length, 0)
    assert.equal(plan.streams[0].courses[0].levelCode, null)
    assert.ok(plan.warnings.some((warning) => warning.column === 'Programs offered'))
  })

  test('warns about unrecognized degree level tokens', () => {
    const plan = buildPlan([makeRow({ programmes: 'M.Voc' })], EMPTY_SNAPSHOT)
    assert.equal(plan.errors.length, 0)
    assert.ok(
      plan.warnings.some(
        (warning) => warning.column === 'programmes' && /unrecognized level token/.test(warning.message),
      ),
    )
  })
})

describe('report formatting', () => {
  const rows = readDepartmentsCsv(defaultCsvPath())

  test('formats a dry-run summary with the plan counts', () => {
    const plan = buildPlan(rows, EMPTY_SNAPSHOT)
    const summary = formatPlanSummary(plan, 'dry-run')
    assert.match(summary, /Import plan \(dry-run\)/)
    assert.match(summary, /rows read\s+: 18/)
    assert.match(summary, /streams planned\s+: 18/)
    assert.match(summary, /courses planned\s+: 26/)
    assert.match(summary, /errors\s+: 0/)
    assert.match(summary, /warnings\s+: 7/)
  })
})

describe('column disposition report', () => {
  test('covers all 23 CSV columns', () => {
    assert.equal(DEPARTMENT_CSV_COLUMNS.length, 23)
    assert.equal(COLUMN_DISPOSITION.length, 23)
    assert.doesNotThrow(() => assertDispositionCoversColumns())
    const covered = new Set(COLUMN_DISPOSITION.map((entry) => entry.column))
    for (const column of DEPARTMENT_CSV_COLUMNS) assert.ok(covered.has(column), column)
  })
})
