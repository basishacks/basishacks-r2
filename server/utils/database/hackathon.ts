import type { H3Event } from 'h3';

export async function getHackathon(event: H3Event): Promise<Hackathon | null> {
  return event.context.db.prepare('SELECT * FROM hackathon').first() as Hackathon | null;
}
