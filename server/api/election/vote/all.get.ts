import { scVotes, users } from "~~/server/database/schema";
import { eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const rows = event.context.drizzle
        .select({
            id: scVotes.id,
            user_id: scVotes.user_id,
            vote: scVotes.vote,
            submitted_at: scVotes.submitted_at,
            name: sql<string | null>`${users.name}`.as("name"),
            email: sql<string | null>`${users.email}`.as("email"),
        })
        .from(scVotes)
        .leftJoin(users, eq(scVotes.user_id, users.id))
        .orderBy(sql`${scVotes.submitted_at} DESC`)
        .all();

    return rows.map(
        (row: {
            id: number;
            user_id: number | null;
            vote: string | null;
            submitted_at: number | null;
            name: string | null;
            email: string | null;
        }) => ({
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            email: row.email,
            submitted_at: row.submitted_at,
            vote: JSON.parse(row.vote!) as Record<string, number | null>,
        }),
    );
});
