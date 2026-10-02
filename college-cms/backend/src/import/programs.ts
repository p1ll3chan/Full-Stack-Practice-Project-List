export const DEGREE_LEVELS = [
  { code: 'ba', name: 'Bachelor of Arts', levelGroup: 'undergraduate', sortOrder: 10 },
  { code: 'bsc', name: 'Bachelor of Science', levelGroup: 'undergraduate', sortOrder: 20 },
  { code: 'bcom', name: 'Bachelor of Commerce', levelGroup: 'undergraduate', sortOrder: 30 },
  { code: 'bvoc', name: 'Bachelor of Vocational Degree', levelGroup: 'vocational', sortOrder: 40 },
  { code: 'ma', name: 'Master of Arts', levelGroup: 'postgraduate', sortOrder: 50 },
  { code: 'msc', name: 'Master of Science', levelGroup: 'postgraduate', sortOrder: 60 },
  { code: 'mcom', name: 'Master of Commerce', levelGroup: 'postgraduate', sortOrder: 70 },
  { code: 'phd', name: 'Doctor of Philosophy', levelGroup: 'doctoral', sortOrder: 80 },
] as const

export type DegreeLevelCode = (typeof DEGREE_LEVELS)[number]['code']

const KNOWN_CODES = new Set<string>(DEGREE_LEVELS.map((level) => level.code))

const LEVEL_PATTERN =
  /\b(?:B\.?\s?COM|M\.?\s?COM|B\.?\s?VOC|M\.?\s?VOC|P\.?H\.?\s?D|B\.?\s?SC|M\.?\s?SC|B\.?\s?A|M\.?\s?A)\b/gi

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, '')
}

export interface LevelParse {
  codes: string[]
  unknown: string[]
}

export function parseLevelTokens(text: string): LevelParse {
  const codes: string[] = []
  const unknown: string[] = []
  for (const match of text.matchAll(LEVEL_PATTERN)) {
    const code = normalizeToken(match[0])
    if (KNOWN_CODES.has(code)) {
      if (!codes.includes(code)) codes.push(code)
    } else if (!unknown.includes(code)) {
      unknown.push(code)
    }
  }
  return { codes, unknown }
}

export function parseLevelCodes(text: string): string[] {
  return parseLevelTokens(text).codes
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

function decodeEntities(text: string): string {
  return text.replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
}

function cleanHtmlText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export function parseProgramsOffered(html: string): string[] {
  const source = html.trim()
  if (!source) return []
  const paragraphs = [...source.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => cleanHtmlText(match[1]))
    .filter((text) => text !== '')
  const candidates = paragraphs.length > 0 ? paragraphs : [cleanHtmlText(source)]
  const programs: string[] = []
  for (const candidate of candidates) {
    if (candidate !== '' && !programs.includes(candidate)) programs.push(candidate)
  }
  return programs
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
}
