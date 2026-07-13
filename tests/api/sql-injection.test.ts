import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockParams,
    mockSession,
    seedHackathon,
    seedSeason,
    seedUser,
    seedTeam,
    type TestContext,
} from "./helpers";
import { eq } from "drizzle-orm";
import { teams, users, oauth2Applications } from "~~/server/database/schema";

vi.mock("~~/server/utils/auth", () => ({
    requireUser: vi.fn(),
    requireJudge: vi.fn(),
    requireAdmin: vi.fn(),
    requirePermission: vi.fn(),
}));

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    DEFAULT_RATE_LIMIT_CONFIG: { maxRequests: 60, windowMs: 60 * 1000 },
}));

const SQL_METACHARACTERS = [
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    "' OR 'a'='a",
    "1; DELETE FROM teams; --",
];

let ctx: TestContext;
let createTeamHandler: any;
let updateTeamHandler: any;
let updateUserHandler: any;
let createApplicationHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const usersDb = await import("~~/server/utils/database/users");
    vi.stubGlobal("getUser", usersDb.getUser);
    vi.stubGlobal("getUserByEmail", usersDb.getUserByEmail);
    vi.stubGlobal("updateUserName", usersDb.updateUserName);
    vi.stubGlobal("updateUserProfileTheme", usersDb.updateUserProfileTheme);
    vi.stubGlobal("updateUserProfilePicture", usersDb.updateUserProfilePicture);

    const teamsDb = await import("~~/server/utils/database/teams");
    vi.stubGlobal("createTeam", teamsDb.createTeam);
    vi.stubGlobal("getTeam", teamsDb.getTeam);
    vi.stubGlobal("getTeamById", teamsDb.getTeamById);
    vi.stubGlobal("updateTeam", teamsDb.updateTeam);
    vi.stubGlobal("deleteTeams", teamsDb.deleteTeams);

    const membersDb = await import("~~/server/utils/database/members");
    vi.stubGlobal("addTeamMember", membersDb.addTeamMember);

    const hackathonDb = await import("~~/server/utils/database/hackathon");
    vi.stubGlobal("getHackathon", hackathonDb.getHackathon);

    const seasonsDb = await import("~~/server/utils/database/seasons");
    vi.stubGlobal("getActiveSeason", seasonsDb.getActiveSeason);

    const oauth2Db = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2ApplicationCountByOwner", oauth2Db.getOAuth2ApplicationCountByOwner);
    vi.stubGlobal("createOAuth2Application", oauth2Db.createOAuth2Application);

    const convert = await import("~~/server/utils/convert");
    vi.stubGlobal("convertTeamToPublic", convert.convertTeamToPublic);
    vi.stubGlobal("convertUserToPublic", convert.convertUserToPublic);

    createTeamHandler = (await import("~~/server/api/teams/index.post")).default;
    updateTeamHandler = (await import("~~/server/api/teams/[id]/index.patch")).default;
    updateUserHandler = (await import("~~/server/api/users/[id]/index.patch")).default;
    createApplicationHandler = (await import("~~/server/api/applications/index.post")).default;
});

beforeEach(async () => {
    resetMockState();
    ctx = await createTestContext();
    seedHackathon(ctx);
    seedSeason(ctx);
});

afterEach(() => {
    resetTestContext(ctx);
});

function createEvent(overrides: Record<string, unknown> = {}) {
    return {
        context: { drizzle: ctx.drizzle },
        ...overrides,
    };
}

describe("SQL injection hardening", () => {
    describe("getUserByEmail database helper", () => {
        it("treats SQL metacharacters in email as literals", async () => {
            const { getUserByEmail } = await import("~~/server/utils/database/users");

            seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            const result = await getUserByEmail(createEvent(), "' OR 1=1 --@basischina.com");

            expect(result).toBeNull();
        });

        it("does not match other users when email contains SQL metacharacters", async () => {
            const { getUserByEmail } = await import("~~/server/utils/database/users");

            seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });
            seedUser(ctx, { email: "bob@basischina.com", name: "Bob" });

            const result = await getUserByEmail(createEvent(), "' OR 1=1 --@basischina.com");

            expect(result).toBeNull();
        });
    });

    describe("POST /api/teams", () => {
        it.each(SQL_METACHARACTERS)("stores team name %j as a literal string", async (name) => {
            seedUser(ctx, { email: "creator@basischina.com" });
            mockSession.value = { user: { id: 1 } };
            mockBody.value = { name };

            const result = await createTeamHandler(createEvent());

            expect(result).toHaveProperty("name", name);

            const row = ctx.drizzle.select().from(teams).where(eq(teams.name, name)).get();
            expect(row).toBeDefined();
            expect(row!.name).toBe(name);

            const allTeams = ctx.drizzle.select().from(teams).all();
            expect(allTeams).toHaveLength(1);
        });
    });

    describe("PATCH /api/teams/:id", () => {
        it.each(SQL_METACHARACTERS)("stores team name %j as a literal string", async (name) => {
            const team = seedTeam(ctx, { name: "Original Name" });
            seedUser(ctx, { email: "member@basischina.com", team_id: team.id });

            mockSession.value = { user: { id: 1 } };
            mockParams.values["id"] = String(team.id);
            mockBody.value = { name };

            const result = await updateTeamHandler(createEvent());

            expect(result).toEqual({ message: "Updated your team & project" });

            const row = ctx.drizzle.select().from(teams).where(eq(teams.id, team.id)).get();
            expect(row!.name).toBe(name);

            const allTeams = ctx.drizzle.select().from(teams).all();
            expect(allTeams).toHaveLength(1);
        });

        it.each(SQL_METACHARACTERS)(
            "stores project description %j as a literal string",
            async (description) => {
                const team = seedTeam(ctx, { name: "Original Name" });
                seedUser(ctx, { email: "member@basischina.com", team_id: team.id });

                mockSession.value = { user: { id: 1 } };
                mockParams.values["id"] = String(team.id);
                mockBody.value = { project: { description } };

                await updateTeamHandler(createEvent());

                const row = ctx.drizzle.select().from(teams).where(eq(teams.id, team.id)).get();
                expect(row!.project_description).toBe(description);
            },
        );
    });

    describe("PATCH /api/users/:id", () => {
        it.each(SQL_METACHARACTERS)("stores user name %j as a literal string", async (name) => {
            const user = seedUser(ctx, { email: "user@basischina.com", name: "Original" });

            mockSession.value = { user: { id: user.id } };
            mockParams.values["id"] = String(user.id);
            mockBody.value = { name };

            const result = await updateUserHandler(createEvent());

            expect(result).toEqual({ message: "Your profile is updated" });

            const row = ctx.drizzle.select().from(users).where(eq(users.id, user.id)).get();
            expect(row!.name).toBe(name);

            const allUsers = ctx.drizzle.select().from(users).all();
            expect(allUsers).toHaveLength(1);
        });
    });

    describe("POST /api/applications", () => {
        it.each(SQL_METACHARACTERS)(
            "stores application name %j as a literal string",
            async (name) => {
                seedUser(ctx, { email: "dev@basischina.com" });
                vi.mocked(globalThis.requirePermission).mockResolvedValue({
                    id: 1,
                    role: "participant",
                });
                mockBody.value = { name, proxy_microsoft: false };

                const result = await createApplicationHandler(createEvent());

                expect(result).toHaveProperty("name", name);

                const row = ctx.drizzle
                    .select()
                    .from(oauth2Applications)
                    .where(eq(oauth2Applications.name, name))
                    .get();
                expect(row).toBeDefined();
                expect(row!.name).toBe(name);
            },
        );

        it.each(SQL_METACHARACTERS)(
            "stores application description %j as a literal string",
            async (description) => {
                seedUser(ctx, { email: "dev@basischina.com" });
                vi.mocked(globalThis.requirePermission).mockResolvedValue({
                    id: 1,
                    role: "participant",
                });
                mockBody.value = { name: "App", description, proxy_microsoft: false };

                const result = await createApplicationHandler(createEvent());

                expect(result).toHaveProperty("description", description);

                const row = ctx.drizzle
                    .select()
                    .from(oauth2Applications)
                    .where(eq(oauth2Applications.client_id, result.client_id))
                    .get();
                expect(row!.description).toBe(description);
            },
        );
    });
});
