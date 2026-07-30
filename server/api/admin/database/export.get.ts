import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import { eq } from "drizzle-orm";
import * as schema from "~~/server/database/schema";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireAdmin(event);

        const format = getQuery(event).format || "sqlite";

        if (format === "sqlite") {
            const dbPath = resolve(process.cwd(), "database", "basishacks.sqlite");
            const data = readFileSync(dbPath);
            setResponseHeader(event, "Content-Type", "application/x-sqlite3");
            setResponseHeader(
                event,
                "Content-Disposition",
                'attachment; filename="basishacks-export.db"',
            );
            return data;
        }

        if (format === "csv") {
            const lines: string[] = [];
            const db = event.context.drizzle;
            const tableDefs: [string, any][] = [
                ["hackathon", db.select().from(schema.hackathon).all()],
                ["seasons", db.select().from(schema.seasons).all()],
                ["teams", db.select().from(schema.teams).all()],
                ["users", db.select().from(schema.users).all()],
                ["team_scores", db.select().from(schema.teamScores).all()],
                ["ballots", db.select().from(schema.ballots).all()],
                ["ballot_scores", db.select().from(schema.ballotScores).all()],
                ["oauth2_applications", db.select().from(schema.oauth2Applications).all()],
                ["peer_voting_scores", db.select().from(schema.peerVotingScores).all()],
                ["team_awards", db.select().from(schema.teamAwards).all()],
                ["user_past_teams", db.select().from(schema.userPastTeams).all()],
            ];
            for (const [name, rows] of tableDefs) {
                if (rows.length === 0) continue;
                lines.push(`--- ${name} ---`);
                lines.push(Object.keys(rows[0]).join(","));
                for (const row of rows) {
                    const vals = Object.values(row).map((v: any) => {
                        if (v === null || v === undefined) return "";
                        const s = String(v);
                        return s.includes(",") || s.includes('"') || s.includes("\n")
                            ? `"${s.replace(/"/g, '""')}"`
                            : s;
                    });
                    lines.push(vals.join(","));
                }
                lines.push("");
            }
            setResponseHeader(event, "Content-Type", "text/csv");
            setResponseHeader(
                event,
                "Content-Disposition",
                'attachment; filename="basishacks-export.csv"',
            );
            return lines.join("\n");
        }

        throw createError({ statusCode: 400, message: "Invalid format. Use 'sqlite' or 'csv'." });
    }, DEFAULT_RATE_LIMIT_CONFIG),
);
