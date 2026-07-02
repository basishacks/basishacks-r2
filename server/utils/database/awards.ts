import type { H3Event } from "h3";
import { eq, and, inArray } from "drizzle-orm";
import { teamAwards } from "~~/server/database/schema";
import { AWARD_REGISTRY, type Award } from "~~/shared/awards";

export interface ResolvedAward {
    team_id: number;
    namespace: string;
    name: string;
    meta: Record<string, unknown>;
    text: string | string[] | null;
}

function parseMeta(meta: string): Record<string, unknown> {
    try {
        return JSON.parse(meta) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export async function getAwards(event: H3Event, teamId: number): Promise<ResolvedAward[]> {
    const rows = event.context.drizzle
        .select()
        .from(teamAwards)
        .where(eq(teamAwards.team_id, teamId))
        .all();

    return rows.map((row: { team_id: number; award: string; meta: string }) => {
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
            text: definition.computed ? definition.computed(meta) : null,
        };
    });
}

export async function getAwardsForTeams(
    event: H3Event,
    teamIds: number[],
): Promise<Record<number, ResolvedAward[]>> {
    if (teamIds.length === 0) return {};

    const rows = event.context.drizzle
        .select()
        .from(teamAwards)
        .where(inArray(teamAwards.team_id, teamIds))
        .all();

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
            text: definition.computed ? definition.computed(meta) : null,
        };

        if (!result[row.team_id]) result[row.team_id] = [];
        result[row.team_id]?.push(resolved);
    }

    return result;
}

export async function createAward(
    event: H3Event,
    teamId: number,
    award: string,
    meta: string,
): Promise<TeamAward> {
    const row = event.context.drizzle
        .insert(teamAwards)
        .values({ team_id: teamId, award, meta })
        .returning()
        .get()!;

    return row;
}

export async function deleteTeamAwards(event: H3Event, teamId: number) {
    event.context.drizzle.delete(teamAwards).where(eq(teamAwards.team_id, teamId)).run();
}

export async function deleteAward(event: H3Event, teamId: number, award: string) {
    event.context.drizzle
        .delete(teamAwards)
        .where(and(eq(teamAwards.team_id, teamId), eq(teamAwards.award, award)))
        .run();
}
