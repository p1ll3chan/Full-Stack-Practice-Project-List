import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { academicDetails, streams, type AcademicDetail, type Stream } from '../db/schema.js'
import { HttpError } from '../middleware/error.js'

export interface PublicDetails {
  stream: Stream
  details: AcademicDetail | null
}

export async function getPublicDetails(streamSlug: string): Promise<PublicDetails> {
  const [stream] = await db
    .select()
    .from(streams)
    .where(and(eq(streams.slug, streamSlug), eq(streams.isActive, true)))
    .limit(1)
  if (!stream) throw new HttpError(404, `Stream "${streamSlug}" not found`, 'not_found')
  const [details] = await db
    .select()
    .from(academicDetails)
    .where(eq(academicDetails.streamId, stream.id))
    .limit(1)
  return { stream, details: details ?? null }
}
