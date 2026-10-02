import 'dotenv/config'
import { eq, isNull } from 'drizzle-orm'
import { checkConnection, client, db } from '../db/index.js'
import * as schema from '../db/schema.js'
import type { PageBlockContent } from '../db/schema.js'
import { slugify } from '../import/programs.js'

interface SectionPage {
  slug: string
  title: string
  section: string
}

const SECTION_PAGES: SectionPage[] = [
  { slug: 'about', title: 'About Us', section: 'about' },
  { slug: 'contact', title: 'Contact Us', section: 'contact' },
  { slug: 'academics', title: 'Academics', section: 'academics' },
  { slug: 'excellence', title: 'Excellence', section: 'excellence' },
  { slug: 'faculty', title: 'Faculty', section: 'faculty' },
]

interface SeedSummary {
  pagesCreated: number
  contactCreated: boolean
  domainsCreated: number
  domainLinksBackfilled: number
  legacyBlocksConverted: number
  facultyLinked: number
  warnings: string[]
}

function splitLegacyList(content: string): string[] {
  return content
    .split(/\r?\n|,\s*/)
    .map((item) => item.trim())
    .filter((item) => item !== '')
}

async function seedInside(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]): Promise<SeedSummary> {
  const summary: SeedSummary = {
    pagesCreated: 0,
    contactCreated: false,
    domainsCreated: 0,
    domainLinksBackfilled: 0,
    legacyBlocksConverted: 0,
    facultyLinked: 0,
    warnings: [],
  }

  for (const section of SECTION_PAGES) {
    const [existing] = await tx
      .select({ id: schema.pages.id })
      .from(schema.pages)
      .where(eq(schema.pages.slug, section.slug))
      .limit(1)
    if (existing) continue
    await tx.insert(schema.pages).values({
      slug: section.slug,
      title: section.title,
      section: section.section,
      blocks: [],
      published: true,
    })
    summary.pagesCreated += 1
  }

  const [contact] = await tx
    .select({ id: schema.collegeContact.id })
    .from(schema.collegeContact)
    .where(eq(schema.collegeContact.id, 1))
    .limit(1)
  if (!contact) {
    await tx.insert(schema.collegeContact).values({ id: 1, collegeName: 'College CMS' })
    summary.contactCreated = true
  }

  const items = await tx.select().from(schema.excellence)
  const domains = await tx.select().from(schema.excellenceDomains)
  const domainBySlug = new Map(domains.map((domain) => [domain.slug, domain.id]))
  const categories = [...new Set(items.map((item) => item.category.trim()).filter((c) => c !== ''))]
  for (const category of categories) {
    const slug = slugify(category)
    if (slug === '') {
      summary.warnings.push(`cannot derive a slug for excellence category "${category}"`)
      continue
    }
    let domainId = domainBySlug.get(slug)
    if (domainId === undefined) {
      const [created] = await tx
        .insert(schema.excellenceDomains)
        .values({ slug, name: category, sortOrder: (summary.domainsCreated + 1) * 10 })
        .returning({ id: schema.excellenceDomains.id })
      domainId = created.id
      domainBySlug.set(slug, domainId)
      summary.domainsCreated += 1
    }
    for (const item of items) {
      if (item.domainId !== null) continue
      if (item.category.trim().toLowerCase() !== category.toLowerCase()) continue
      await tx
        .update(schema.excellence)
        .set({ domainId, updatedAt: new Date() })
        .where(eq(schema.excellence.id, item.id))
      summary.domainLinksBackfilled += 1
    }
  }

  const pages = await tx.select().from(schema.pages)
  for (const page of pages) {
    if (!Array.isArray(page.blocks) || page.blocks.length === 0) continue
    const [existingBlock] = await tx
      .select({ id: schema.pageBlocks.id })
      .from(schema.pageBlocks)
      .where(eq(schema.pageBlocks.pageId, page.id))
      .limit(1)
    if (existingBlock) continue
    let position = 0
    for (const legacy of page.blocks) {
      let type: string
      let content: PageBlockContent
      let mediaId: number | null = null
      switch (legacy.type) {
        case 'heading':
          type = 'heading'
          content = { text: legacy.content, level: 2 }
          break
        case 'paragraph':
          type = 'paragraph'
          content = { text: legacy.content }
          break
        case 'list':
          type = 'list'
          content = { ordered: false, items: splitLegacyList(legacy.content) }
          break
        case 'image': {
          type = 'image'
          content = { alt: '', caption: '' }
          const [existingMedia] = await tx
            .select({ id: schema.media.id })
            .from(schema.media)
            .where(eq(schema.media.sourceRef, legacy.content))
            .limit(1)
          if (existingMedia) {
            mediaId = existingMedia.id
          } else {
            const [insertedMedia] = await tx
              .insert(schema.media)
              .values({
                sourceSystem: 'legacy',
                sourceRef: legacy.content,
                url: legacy.content,
                status: 'ready',
                altText: '',
              })
              .returning({ id: schema.media.id })
            mediaId = insertedMedia.id
          }
          break
        }
        default:
          summary.warnings.push(
            `page "${page.slug}": unsupported legacy block type "${String(legacy.type)}" skipped`,
          )
          continue
      }
      await tx.insert(schema.pageBlocks).values({
        pageId: page.id,
        type,
        position,
        content,
        mediaId,
      })
      position += 10
      summary.legacyBlocksConverted += 1
    }
  }

  const members = await tx
    .select()
    .from(schema.facultyMembers)
    .where(isNull(schema.facultyMembers.streamId))
  const streams = await tx.select().from(schema.streams)
  for (const member of members) {
    const department = member.department.trim().toLowerCase()
    if (department === '') continue
    const match = streams.find((stream) => {
      const name = stream.name.trim().toLowerCase().replace(/^department of\s+/, '')
      return name === department || stream.name.trim().toLowerCase() === department
    })
    if (!match) {
      summary.warnings.push(
        `faculty "${member.name}": no stream matches department "${member.department}"`,
      )
      continue
    }
    await tx
      .update(schema.facultyMembers)
      .set({ streamId: match.id, updatedAt: new Date() })
      .where(eq(schema.facultyMembers.id, member.id))
    summary.facultyLinked += 1
  }

  return summary
}

async function main(): Promise<void> {
  if (!(await checkConnection())) {
    throw new Error('cannot reach the database; is it running and is DATABASE_URL set?')
  }
  const summary = await db.transaction((tx) => seedInside(tx))
  console.log('Seed complete:')
  console.log(`  section pages created   : ${summary.pagesCreated}`)
  console.log(`  college_contact created : ${summary.contactCreated}`)
  console.log(`  excellence domains      : ${summary.domainsCreated}`)
  console.log(`  domain links backfilled : ${summary.domainLinksBackfilled}`)
  console.log(`  legacy blocks converted : ${summary.legacyBlocksConverted}`)
  console.log(`  faculty stream links    : ${summary.facultyLinked}`)
  for (const warning of summary.warnings) console.log(`  warning: ${warning}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
