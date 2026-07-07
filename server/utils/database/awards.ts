import type { H3Event } from "h3";
<<<<<<< HEAD
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
=======

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
>>>>>>> score-release-patch
    } catch {
        return {};
    }
}

export async function getAwards(event: H3Event, teamId: number): Promise<ResolvedAward[]> {
<<<<<<< HEAD
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
=======
    const rows = (
        event.context.db
            .prepare(
                `SELECT ta.team_id, ta.award_id, ta.meta, a.name, a.description, a.icon, a.color
         FROM team_awards ta
         JOIN awards a ON ta.award_id = a.id
         WHERE ta.team_id = ?`,
            )
            .bind(teamId)
            .all() as { results: (TeamAward & Award)[] }
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
>>>>>>> score-release-patch
}

export async function getAwardsForTeams(
    event: H3Event,
    teamIds: number[],
): Promise<Record<number, ResolvedAward[]>> {
    if (teamIds.length === 0) return {};

<<<<<<< HEAD
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
=======
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
            .all() as { results: (TeamAward & Award)[] }
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
>>>>>>> score-release-patch
    }

    return result;
}

export async function createAward(
    event: H3Event,
    teamId: number,
<<<<<<< HEAD
    award: string,
    meta: string,
): Promise<TeamAward> {
    const row = event.context.drizzle
        .insert(teamAwards)
        .values({ team_id: teamId, award, meta })
        .returning()
        .get()!;
=======
    awardId: number,
    meta?: string,
): Promise<TeamAward> {
    const row = (event.context.db
        .prepare("INSERT INTO team_awards(team_id, award_id, meta) VALUES(?, ?, ?) RETURNING *")
        .bind(teamId, awardId, meta ?? null)
        .first() as TeamAward)!;
>>>>>>> score-release-patch

    return row;
}

export async function deleteTeamAwards(event: H3Event, teamId: number) {
<<<<<<< HEAD
    event.context.drizzle.delete(teamAwards).where(eq(teamAwards.team_id, teamId)).run();
}

export async function deleteAward(event: H3Event, teamId: number, award: string) {
    event.context.drizzle
        .delete(teamAwards)
        .where(and(eq(teamAwards.team_id, teamId), eq(teamAwards.award, award)))
=======
    event.context.db.prepare("DELETE FROM team_awards WHERE team_id = ?").bind(teamId).run();
}

export async function deleteAward(event: H3Event, teamId: number, awardId: number) {
    event.context.db
        .prepare("DELETE FROM team_awards WHERE team_id = ? AND award_id = ?")
        .bind(teamId, awardId)
>>>>>>> score-release-patch
        .run();
}
