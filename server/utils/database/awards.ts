import type { H3Event } from "h3";

export interface Award {
    namespace: string;
    name: string;
    computed: (meta: Record<string, unknown>) => string;
}

export const AWARD_REGISTRY: Record<string, Award> = {
    best_overall: {
        namespace: "best_overall",
        name: "Best Overall",
        computed: () => "Best Overall Award",
    },
    score_threshold: {
        namespace: "score_threshold",
        name: "Score Threshold",
        computed: (meta) => `Some text = ${(meta as any).value ?? 0}`,
    },
};

export interface ResolvedAward {
    team_id: number;
    namespace: string;
    name: string;
    meta: Record<string, unknown>;
    text: string;
}

function parseMeta(meta: string): Record<string, unknown> {
    try {
        return JSON.parse(meta) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export async function getAwards(event: H3Event, teamId: number): Promise<ResolvedAward[]> {
    const rows = (
        event.context.db
            .prepare("SELECT * FROM team_awards WHERE team_id = ?")
            .bind(teamId)
            .all() as { results: TeamAward[] }
    ).results;

    return rows.map((row) => {
        const meta = parseMeta(row.meta);
        const definition = AWARD_REGISTRY[row.award] ?? {
            namespace: row.award,
            name: row.award,
            computed: () => row.award,
        };

        return {
            team_id: row.team_id,
            namespace: row.award,
            name: definition.name,
            meta,
            text: definition.computed(meta),
        };
    });
}

export async function getAwardsForTeams(
    event: H3Event,
    teamIds: number[],
): Promise<Record<number, ResolvedAward[]>> {
    if (teamIds.length === 0) return {};

    const placeholders = teamIds.map(() => "?").join(",");
    const rows = (
        event.context.db
            .prepare(`SELECT * FROM team_awards WHERE team_id IN (${placeholders})`)
            .bind(...teamIds)
            .all() as { results: TeamAward[] }
    ).results;

    const result: Record<number, ResolvedAward[]> = {};
    for (const row of rows) {
        const meta = parseMeta(row.meta);
        const definition = AWARD_REGISTRY[row.award] ?? {
            namespace: row.award,
            name: row.award,
            computed: () => row.award,
        };

        const resolved: ResolvedAward = {
            team_id: row.team_id,
            namespace: row.award,
            name: definition.name,
            meta,
            text: definition.computed(meta),
        };

        if (!result[row.team_id]) result[row.team_id] = [];
        result[row.team_id].push(resolved);
    }

    return result;
}

export async function createAward(
    event: H3Event,
    teamId: number,
    award: string,
    meta: string,
): Promise<TeamAward> {
    const row = (event.context.db
        .prepare("INSERT INTO team_awards(team_id, award, meta) VALUES(?, ?, ?) RETURNING *")
        .bind(teamId, award, meta)
        .first() as TeamAward)!;

    return row;
}

export async function deleteTeamAwards(event: H3Event, teamId: number) {
    event.context.db.prepare("DELETE FROM team_awards WHERE team_id = ?").bind(teamId).run();
}

export async function deleteAward(event: H3Event, teamId: number, award: string) {
    event.context.db
        .prepare("DELETE FROM team_awards WHERE team_id = ? AND award = ?")
        .bind(teamId, award)
        .run();
}
