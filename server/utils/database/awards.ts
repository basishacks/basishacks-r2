import type { H3Event } from "h3";
import { eq, inArray, and } from "drizzle-orm";
import { teamAwards } from "~~/server/database/schema";
import { AWARD_REGISTRY, type Award } from "~~/shared/awards";

export interface ResolvedAward {
    team_id: number;
    namespace: string;
    name: string;
    description: string;
    icon: string;
    meta: Record<string, unknown>;
    color: string;
    text: string;
}

function parseMeta(meta: string): Record<string, unknown> {
    try {
        return JSON.parse(meta) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function resolveAward(row: { team_id: number; award: string; meta: string }): ResolvedAward {
    const definition: Award | undefined = AWARD_REGISTRY[row.award];
    const meta = parseMeta(row.meta);
    const namespace = row.award;

    const name = definition?.name ?? namespace;
    const description = definition?.description ?? namespace;
    const icon = definition?.icon ?? "i-lucide-award";
    const color = (definition as (Award & { color?: string }) | undefined)?.color ?? "gold";
    const text = definition?.computed ? definition.computed(meta).join(", ") : description;

    return {
        team_id: row.team_id,
        namespace,
        name,
        description,
        icon,
        meta,
        color,
        text,
    };
}

export async function getAwards(event: H3Event, teamId: number): Promise<ResolvedAward[]> {
    const rows = await event.context.drizzle
        .select()
        .from(teamAwards)
        .where(eq(teamAwards.team_id, teamId))
        .all();

    return rows.map(resolveAward);
}

export async function getAwardsForTeams(
    event: H3Event,
    teamIds: number[],
): Promise<Record<number, ResolvedAward[]>> {
    if (teamIds.length === 0) return {};

    const rows = await event.context.drizzle
        .select()
        .from(teamAwards)
        .where(inArray(teamAwards.team_id, teamIds))
        .all();

    const result: Record<number, ResolvedAward[]> = {};
    for (const row of rows) {
        const award = resolveAward(row);
        if (!result[row.team_id]) result[row.team_id] = [];
        result[row.team_id]!.push(award);
    }

    return result;
}

export async function createAward(
    event: H3Event,
    teamId: number,
    award: string,
    meta?: string,
): Promise<TeamAward> {
    const row = event.context.drizzle
        .insert(teamAwards)
        .values({ team_id: teamId, award, meta: meta ?? "{}" })
        .returning()
        .get()!;

    return row as TeamAward;
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
