import type { H3Event } from "h3";

export interface ResolvedAward {
    team_id: number;
    award_id: number;
    name: string;
    description: string;
    icon: string;
    meta: Record<string, unknown>;
    color: string;
}

function parseMeta(meta: string | null): Record<string, unknown> {
    try {
        return JSON.parse(meta ?? "{}") as Record<string, unknown>;
    } catch {
        return {};
    }
}

export async function getAwards(event: H3Event, teamId: number): Promise<ResolvedAward[]> {
    const rows = (
        event.context.db
            .prepare(
                `SELECT ta.team_id, ta.award_id, ta.meta, a.name, a.description, a.icon, a.color
         FROM team_awards ta
         JOIN awards a ON ta.award_id = a.id
         WHERE ta.team_id = ?`,
            )
            .bind(teamId)
            .all() as { results: (TeamAward & ResolvedAward)[] }
    ).results;

    return rows.map((row) => ({
        team_id: row.team_id,
        award_id: row.award_id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        meta: parseMeta(row.meta),
        color: row.color
    }));
}

export async function getAwardsForTeams(
    event: H3Event,
    teamIds: number[],
): Promise<Record<number, ResolvedAward[]>> {
    if (teamIds.length === 0) return {};

    const placeholders = teamIds.map(() => "?").join(",");
    const rows = (
        event.context.db
            .prepare(
                `SELECT ta.team_id, ta.award_id, ta.meta, a.name, a.description, a.icon, a.color
         FROM team_awards ta
         JOIN awards a ON ta.award_id = a.id
         WHERE ta.team_id IN (${placeholders})`,
            )
            .bind(...teamIds)
            .all() as { results: (TeamAward & ResolvedAward)[] }
    ).results;

    const result: Record<number, ResolvedAward[]> = {};
    for (const row of rows) {
        const award: ResolvedAward = {
            team_id: row.team_id,
            award_id: row.award_id,
            name: row.name, 
            description: row.description,
            icon: row.icon,
            meta: parseMeta(row.meta),
            color: row.color
        };

        if (!result[row.team_id]) result[row.team_id] = [];
        result[row.team_id]?.push(award);
    }

    return result;
}

export async function createAward(
    event: H3Event,
    teamId: number,
    awardId: number,
    meta?: string,
): Promise<TeamAward> {
    const row = (event.context.db
        .prepare("INSERT INTO team_awards(team_id, award_id, meta) VALUES(?, ?, ?) RETURNING *")
        .bind(teamId, awardId, meta ?? null)
        .first() as TeamAward)!;

    return row;
}

export async function deleteTeamAwards(event: H3Event, teamId: number) {
    event.context.db.prepare("DELETE FROM team_awards WHERE team_id = ?").bind(teamId).run();
}

export async function deleteAward(event: H3Event, teamId: number, awardId: number) {
    event.context.db
        .prepare("DELETE FROM team_awards WHERE team_id = ? AND award_id = ?")
        .bind(teamId, awardId)
        .run();
}
