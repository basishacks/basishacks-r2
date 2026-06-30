import type { H3Event } from 'h3'
import { hackathon } from '~~/server/database/schema'

export async function getHackathon(event: H3Event): Promise<Hackathon | null> {
  const row = event.context.drizzle
    .select()
    .from(hackathon)
    .get()

  return row ?? null
}