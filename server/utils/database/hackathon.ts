import type { H3Event } from "h3";
import { eq } from "drizzle-orm";
import { hackathon } from "~~/server/database/schema";

export async function getHackathon(event: H3Event): Promise<Hackathon | null> {
    const row = event.context.drizzle.select().from(hackathon).get();

    return (row ?? null) as Hackathon | null;
}

export async function updateHackathon(
    event: H3Event,
    data: Partial<Omit<Hackathon, "id" | "submitted_count">>,
): Promise<Hackathon | null> {
    event.context.drizzle.update(hackathon).set(data).where(eq(hackathon.id, 1)).run();

    return getHackathon(event);
}
