import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

export const DEPARTMENT_CSV_COLUMNS = [
  'Overview',
  'Title',
  'Departments (Item)',
  'ID',
  'Created Date',
  'Updated Date',
  'Owner',
  'slug',
  'menu_group',
  'display_order',
  'department_image',
  'courses_offered',
  'is_active',
  'Departments (List)',
  'description',
  'icon_code',
  'category_color',
  'programmes',
  'Icon_svg',
  'icon image',
  'Programs offered',
  'tagline',
  'Research',
] as const

export type DepartmentCsvColumn = (typeof DEPARTMENT_CSV_COLUMNS)[number]

export type DepartmentCsvRow = Record<string, string>

export function readDepartmentsCsv(filePath: string): DepartmentCsvRow[] {
  const raw = fs.readFileSync(filePath)
  const records = parse(raw, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as DepartmentCsvRow[]

  if (records.length === 0) {
    throw new Error(`${filePath}: no data rows found`)
  }

  const header = Object.keys(records[0])
  const missing = DEPARTMENT_CSV_COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    throw new Error(`${filePath}: missing expected columns: ${missing.join(', ')}`)
  }
  const unexpected = header.filter(
    (column) => !(DEPARTMENT_CSV_COLUMNS as readonly string[]).includes(column),
  )
  if (unexpected.length > 0) {
    throw new Error(`${filePath}: unexpected columns: ${unexpected.join(', ')}`)
  }

  return records
}

export function defaultCsvPath(): string {
  return fileURLToPath(new URL('../../../Departments.csv', import.meta.url))
}
