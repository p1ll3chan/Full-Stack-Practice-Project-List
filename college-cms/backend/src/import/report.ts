import { DEPARTMENT_CSV_COLUMNS } from './csv.js'
import type { ImportIssue, ImportPlan } from './departments.js'

export interface ColumnDisposition {
  column: string
  target: string
  note: string
}

export const COLUMN_DISPOSITION: ColumnDisposition[] = [
  { column: 'Overview', target: 'academic_details.overview + overview_source', note: 'Wix rich text normalized to RichDoc; raw JSON preserved' },
  { column: 'Title', target: 'streams.name', note: '' },
  { column: 'Departments (Item)', target: 'streams.source_path', note: 'original Wix path, kept for redirects' },
  { column: 'ID', target: 'streams.source_id', note: 'Wix uuid, idempotency key for re-imports' },
  { column: 'Created Date', target: 'streams.created_at', note: 'falls back to now() when empty' },
  { column: 'Updated Date', target: 'streams.updated_at', note: 'falls back to now() when empty' },
  { column: 'Owner', target: 'streams.source_owner', note: 'Wix user uuid, provenance only' },
  { column: 'slug', target: 'streams.slug', note: 'derived from Title when missing' },
  { column: 'menu_group', target: 'streams.category', note: 'Arts / Science / Others' },
  { column: 'display_order', target: 'streams.sort_order', note: 'duplicates reported as warnings' },
  { column: 'department_image', target: '-', note: 'empty in every row; would map to media' },
  { column: 'courses_offered', target: '-', note: 'empty in every row; superseded by Programs offered' },
  { column: 'is_active', target: 'streams.is_active', note: 'empty treated as true with a warning' },
  { column: 'Departments (List)', target: '-', note: 'constant navigation path, not content' },
  { column: 'description', target: 'streams.short_description', note: '' },
  { column: 'icon_code', target: '-', note: 'empty in every row' },
  { column: 'category_color', target: '-', note: 'empty in every row' },
  { column: 'programmes', target: 'degree_level_streams', note: 'level codes joined to degree_levels' },
  { column: 'Icon_svg', target: 'streams.icon_svg', note: '' },
  { column: 'icon image', target: 'media -> streams.image_media_id', note: 'wix:image:// pointer stored as status=referenced, url is null' },
  { column: 'Programs offered', target: 'courses + academic_details.programs_html', note: 'list/paragraph HTML parsed into course titles; raw HTML preserved' },
  { column: 'tagline', target: 'streams.tagline', note: '' },
  { column: 'Research', target: '-', note: 'constant navigation path, not content' },
]

export function assertDispositionCoversColumns(): void {
  const covered = new Set(COLUMN_DISPOSITION.map((entry) => entry.column))
  const missing = DEPARTMENT_CSV_COLUMNS.filter((column) => !covered.has(column))
  if (missing.length > 0) {
    throw new Error(`column disposition is missing: ${missing.join(', ')}`)
  }
}

export function formatColumnDisposition(): string {
  const lines = COLUMN_DISPOSITION.map((entry) => {
    const note = entry.note === '' ? '' : `  (${entry.note})`
    return `  ${entry.column.padEnd(20)} -> ${entry.target}${note}`
  })
  return lines.join('\n')
}

export function formatIssues(label: string, issues: ImportIssue[]): string {
  if (issues.length === 0) return `${label}: none`
  const lines = issues.map((issue) => {
    const where = issue.row === null ? 'plan' : `row ${issue.row}`
    const column = issue.column === null ? '' : ` [${issue.column}]`
    return `  ${where}${column}: ${issue.message}`
  })
  return `${label} (${issues.length}):\n${lines.join('\n')}`
}

export function formatPlanSummary(plan: ImportPlan, mode: 'dry-run' | 'write'): string {
  const lines = [
    `Import plan (${mode})`,
    `  rows read        : ${plan.stats.rows}`,
    `  streams planned  : ${plan.stats.streams}`,
    `  courses planned  : ${plan.stats.courses}`,
    `  media refs       : ${plan.stats.media}`,
    `  level links      : ${plan.stats.links}`,
    `  degree levels    : ${plan.degreeLevelCodes.length > 0 ? plan.degreeLevelCodes.join(', ') : '-'}`,
    `  errors           : ${plan.stats.errors}`,
    `  warnings         : ${plan.stats.warnings}`,
  ]
  return lines.join('\n')
}
