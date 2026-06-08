export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const { results: rows } = event.context.db
        .prepare(
            `
            SELECT v.user_id, v.vote, v.submitted_at, u.name, u.email
            FROM sc_votes v
            LEFT JOIN users u ON v.user_id = u.id
            ORDER BY v.submitted_at DESC
            `,
        )
        .all<{
            user_id: number;
            vote: string;
            submitted_at: number | null;
            name: string | null;
            email: string | null;
        }>();

    return rows.map((row) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        submitted_at: row.submitted_at,
        vote: JSON.parse(row.vote) as Record<string, number | null>,
    }));
});
