import 'dotenv/config'
import { parseArgs } from 'node:util'
import { checkConnection, client, db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { applyPlan } from '../import/apply.js'
import { buildPlan, type DbSnapshot } from '../import/departments.js'
import { defaultCsvPath, readDepartmentsCsv } from '../import/csv.js'
import {
  assertDispositionCoversColumns,
  formatColumnDisposition,
  formatIssues,
  formatPlanSummary,
} from '../import/report.js'

async function loadSnapshot(): Promise<DbSnapshot> {
  const [streams, courses, media, degreeLevels] = await Promise.all([
    db
      .select({ id: schema.streams.id, slug: schema.streams.slug, sourceId: schema.streams.sourceId })
      .from(schema.streams),
    db
      .select({ id: schema.courses.id, slug: schema.courses.slug, title: schema.courses.title })
      .from(schema.courses),
    db
      .select({
        id: schema.media.id,
        sourceSystem: schema.media.sourceSystem,
        sourceRef: schema.media.sourceRef,
      })
      .from(schema.media),
    db
      .select({ id: schema.degreeLevels.id, code: schema.degreeLevels.code })
      .from(schema.degreeLevels),
  ])
  return { streams, courses, media, degreeLevels }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      write: { type: 'boolean', default: false },
      file: { type: 'string' },
    },
    strict: true,
  })

  if (!(await checkConnection())) {
    throw new Error('cannot reach the database; is it running and is DATABASE_URL set?')
  }

  assertDispositionCoversColumns()
  const csvPath = values.file ?? defaultCsvPath()
  const rows = readDepartmentsCsv(csvPath)
  const snapshot = await loadSnapshot()
  const plan = buildPlan(rows, snapshot)
  const mode = values.write ? 'write' : 'dry-run'

  console.log(formatPlanSummary(plan, mode))
  console.log('')
  console.log(`Source: ${csvPath}`)
  console.log('')
  console.log('Column disposition:')
  console.log(formatColumnDisposition())
  console.log('')
  console.log(formatIssues('Errors', plan.errors))
  console.log(formatIssues('Warnings', plan.warnings))

  if (plan.errors.length > 0) {
    console.error('')
    console.error('Import blocked by errors; nothing was written.')
    process.exitCode = 1
    return
  }

  if (!values.write) {
    console.log('')
    console.log('Dry run only, nothing was written. Re-run with --write to apply.')
    return
  }

  const result = await applyPlan(db, plan)
  console.log('')
  console.log('Applied:')
  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
