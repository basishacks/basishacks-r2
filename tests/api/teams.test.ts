import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockQueryState,
    mockParams,
    mockSession,
    seedHackathon,
    seedSeason,
    seedUser,
    seedTeam,
    type TestContext,
} from "./helpers";
import { eq } from "drizzle-orm";
import { teams, users } from "~~/server/database/schema";

vi.mock("~~/server/utils/auth", () => ({
    requireUser: vi.fn(),
    requireJudge: vi.fn(),
    requireAdmin: vi.fn(),
    requirePermission: vi.fn(),
}));

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
}));

let ctx: TestContext;
let listHandler: any;
let createHandler: any;
let getHandler: any;
let patchHandler: any;
let submitHandler: any;
let membersHandler: any;
let addMemberHandler: any;
let removeMemberHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const usersDb = await import("~~/server/utils/database/users");
    vi.stubGlobal("getUser", usersDb.getUser);
    vi.stubGlobal("getUserByEmail", usersDb.getUserByEmail);

    const teamsDb = await import("~~/server/utils/database/teams");
    vi.stubGlobal("getTeam", teamsDb.getTeam);
    vi.stubGlobal("getAllTeams", teamsDb.getAllTeams);
    vi.stubGlobal("getSubmittedTeams", teamsDb.getSubmittedTeams);
    vi.stubGlobal("getSubmittedUnjudgedTeams", teamsDb.getSubmittedUnjudgedTeams);
    vi.stubGlobal("getTeamsBySeason", teamsDb.getTeamsBySeason);
    vi.stubGlobal("getTeamById", teamsDb.getTeamById);
    vi.stubGlobal("createTeam", teamsDb.createTeam);
    vi.stubGlobal("updateTeam", teamsDb.updateTeam);

    const membersDb = await import("~~/server/utils/database/members");
    vi.stubGlobal("getTeamMembers", membersDb.getTeamMembers);
    vi.stubGlobal("getAllTeamMembers", membersDb.getAllTeamMembers);
    vi.stubGlobal("addTeamMember", membersDb.addTeamMember);
    vi.stubGlobal("removeTeamMember", membersDb.removeTeamMember);

    const hackathonDb = await import("~~/server/utils/database/hackathon");
    vi.stubGlobal("getHackathon", hackathonDb.getHackathon);

    const seasonsDb = await import("~~/server/utils/database/seasons");
    vi.stubGlobal("getActiveSeason", seasonsDb.getActiveSeason);
    vi.stubGlobal("getScoreRankVisibilityResolver", seasonsDb.getScoreRankVisibilityResolver);

    const awardsDb = await import("~~/server/utils/database/awards");
    vi.stubGlobal("getAwardsForTeams", awardsDb.getAwardsForTeams);
    vi.stubGlobal("getAwards", awardsDb.getAwards);

    const { convertUserToPublic, convertTeamToPublic } = await import("~~/server/utils/convert");
    vi.stubGlobal("convertUserToPublic", convertUserToPublic);
    vi.stubGlobal("convertTeamToPublic", convertTeamToPublic);

    listHandler = (await import("~~/server/api/teams/index.get")).default;
    createHandler = (await import("~~/server/api/teams/index.post")).default;
    getHandler = (await import("~~/server/api/teams/[id]/index.get")).default;
    patchHandler = (await import("~~/server/api/teams/[id]/index.patch")).default;
    submitHandler = (await import("~~/server/api/teams/[id]/submit.post")).default;
    membersHandler = (await import("~~/server/api/teams/[id]/users/index.get")).default;
    addMemberHandler = (await import("~~/server/api/teams/[id]/users/index.post")).default;
    removeMemberHandler = (await import("~~/server/api/teams/[id]/users/[user]/index.delete"))
        .default;
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

describe("GET /api/teams", () => {
    it("returns all teams for the active season", async () => {
        seedTeam(ctx, { name: "Team Alpha" });
        seedTeam(ctx, { name: "Team Beta" });

        const result = await listHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty("name", "Team Alpha");
        expect(result[1]).toHaveProperty("name", "Team Beta");
    });

    it("returns teams filtered by season_id", async () => {
        const s1 = seedSeason(ctx, { name: "Filter Season 1", is_active: 0 });
        const s2 = seedSeason(ctx, { name: "Filter Season 2", is_active: 0 });

        seedTeam(ctx, { name: "Team S1", season_id: s1.id });
        seedTeam(ctx, { name: "Team S2", season_id: s2.id });

        mockQueryState.value = { season_id: s2.id };

        const result = await listHandler(createEvent());

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty("name", "Team S2");
    });

    it("returns unjudged teams for judges with judging query", async () => {
        const { requireJudge } = await import("~~/server/utils/auth");
        (requireJudge as any).mockResolvedValue({ id: 1, role: "judge" });

        seedTeam(ctx, { name: "Submitted Team", project_submitted: 1, pathway: "junior" });

        mockQueryState.value = { judging: "true" };

        const result = await listHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
    });
});

describe("POST /api/teams", () => {
    it("returns 401 when not authenticated", async () => {
        mockBody.value = { name: "New Team" };
        await expect(createHandler(createEvent())).rejects.toMatchObject({ statusCode: 401 });
    });

    it("returns 403 when user is already in a team", async () => {
        const team = seedTeam(ctx, { name: "Existing Team" });
        seedUser(ctx, { email: "user@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockBody.value = { name: "New Team" };

        await expect(createHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("creates a team and joins the creator when add query is true", async () => {
        seedUser(ctx, { email: "user@basischina.com", name: "Creator" });

        mockSession.value = { user: { id: 1 } };
        mockBody.value = { name: "My New Team" };
        mockQueryState.value = { add: "true" };

        const result = await createHandler(createEvent());

        expect(result).toHaveProperty("name", "My New Team");

        // Verify the user was added to the team
        const updatedUser = ctx.drizzle.select().from(users).where(eq(users.id, 1)).get();
        expect(updatedUser!.team_id).toBe(result.id);
    });

    it("returns 403 when hackathon is not in progress", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx, { status: "finished" });
        seedSeason(ctx);
        seedUser(ctx, { email: "user@basischina.com" });

        mockSession.value = { user: { id: 1 } };
        mockBody.value = { name: "Late Team" };

        await expect(createHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("deletes the created team when adding the creator fails", async () => {
        seedUser(ctx, { email: "user@basischina.com" });

        mockSession.value = { user: { id: 1 } };
        mockBody.value = { name: "Race Team" };
        mockQueryState.value = { add: "true" };

        vi.stubGlobal(
            "addTeamMember",
            vi.fn().mockRejectedValue({
                statusCode: 404,
                message: "User not found or already in a team",
            }),
        );

        await expect(createHandler(createEvent())).rejects.toMatchObject({
            statusCode: 404,
        });

        const team = ctx.drizzle.select().from(teams).where(eq(teams.name, "Race Team")).get();
        expect(team).toBeUndefined();

        const membersDb = await import("~~/server/utils/database/members");
        vi.stubGlobal("addTeamMember", membersDb.addTeamMember);
    });
});

describe("GET /api/teams/:id", () => {
    it("returns 404 for non-existing team", async () => {
        const { requireUser } = await import("~~/server/utils/auth");
        (requireUser as any).mockResolvedValue({ id: 1, team_id: null, role: "participant" });

        mockParams.values["id"] = "9999";

        await expect(getHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns team details for a member", async () => {
        const { requireUser } = await import("~~/server/utils/auth");
        const team = seedTeam(ctx, { name: "My Team" });
        (requireUser as any).mockResolvedValue({ id: 1, team_id: team.id, role: "participant" });

        mockParams.values["id"] = String(team.id);

        const result = await getHandler(createEvent());

        expect(result).toHaveProperty("name", "My Team");
        expect(result).toHaveProperty("awards");
    });

    it("hides score and rank for a member when hackathon toggles are off", async () => {
        const team = seedTeam(ctx, { name: "My Team" });
        ctx.drizzle.update(teams).set({ score: 95, rank: 1 }).where(eq(teams.id, team.id)).run();
        (globalThis as any).requireUser.mockResolvedValue({
            id: 1,
            team_id: team.id,
            role: "participant",
        });

        mockParams.values["id"] = String(team.id);

        const result = await getHandler(createEvent());

        expect(result.score).toBeNull();
        expect(result.rank).toBeNull();
    });

    it("shows score and rank for a member when the season toggles are on", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx);
        const season = seedSeason(ctx, { show_scores: 1, show_ranking: 1 });

        const team = seedTeam(ctx, { name: "My Team", season_id: season.id });
        ctx.drizzle.update(teams).set({ score: 95, rank: 1 }).where(eq(teams.id, team.id)).run();
        (globalThis as any).requireUser.mockResolvedValue({
            id: 1,
            team_id: team.id,
            role: "participant",
        });

        mockParams.values["id"] = String(team.id);

        const result = await getHandler(createEvent());

        expect(result.score).toBe(95);
        expect(result.rank).toBe(1);
    });

    it("shows score and rank for privileged roles regardless of toggles", async () => {
        const team = seedTeam(ctx, { name: "My Team" });
        ctx.drizzle.update(teams).set({ score: 95, rank: 1 }).where(eq(teams.id, team.id)).run();
        (globalThis as any).requireUser.mockResolvedValue({
            id: 1,
            team_id: null,
            role: "admin",
        });

        mockParams.values["id"] = String(team.id);

        const result = await getHandler(createEvent());

        expect(result.score).toBe(95);
        expect(result.rank).toBe(1);
    });

    it("hides rank in the public team listing when the hackathon toggle is off", async () => {
        const team = seedTeam(ctx, { name: "Team Alpha" });
        ctx.drizzle.update(teams).set({ rank: 3 }).where(eq(teams.id, team.id)).run();

        const result = await listHandler(createEvent());

        expect(result[0].rank).toBeNull();
    });

    it("shows rank in the public team listing when the season toggle is on", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx);
        const season = seedSeason(ctx, { show_ranking: 1 });

        const team = seedTeam(ctx, { name: "Team Alpha", season_id: season.id });
        ctx.drizzle.update(teams).set({ rank: 3 }).where(eq(teams.id, team.id)).run();

        const result = await listHandler(createEvent());

        expect(result[0].rank).toBe(3);
    });

    it("binds listing rank visibility to each team's own season, not the live season", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx, { show_ranking: 1 });
        const liveSeason = seedSeason(ctx, { name: "Live Season", show_ranking: 1 });
        const oldSeason = seedSeason(ctx, { name: "Old Season", is_active: 0, show_ranking: 0 });

        const liveTeam = seedTeam(ctx, { name: "Live Team", season_id: liveSeason.id });
        const oldTeam = seedTeam(ctx, { name: "Old Team", season_id: oldSeason.id });
        ctx.drizzle.update(teams).set({ rank: 1 }).where(eq(teams.id, liveTeam.id)).run();
        ctx.drizzle.update(teams).set({ rank: 2 }).where(eq(teams.id, oldTeam.id)).run();

        mockQueryState.value = { season_id: String(liveSeason.id) };
        const liveResult = await listHandler(createEvent());
        expect(liveResult[0].rank).toBe(1);

        mockQueryState.value = { season_id: String(oldSeason.id) };
        const oldResult = await listHandler(createEvent());
        expect(oldResult[0].rank).toBeNull();
    });
});

describe("PATCH /api/teams/:id", () => {
    it("returns 403 when user is not a team member", async () => {
        const team = seedTeam(ctx, { name: "Other Team" });
        seedUser(ctx, { email: "user@basischina.com", team_id: null });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = { name: "Hacked" };

        await expect(patchHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("updates team name and project details", async () => {
        const team = seedTeam(ctx, { name: "Old Name" });
        seedUser(ctx, { email: "user@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = {
            name: "New Name",
            project: {
                name: "Cool Project",
                description: "A very cool project description goes here.",
                demo_url: "https://demo.example.com",
                repo_url: "https://github.com/example/repo",
            },
        };

        const result = await patchHandler(createEvent());

        expect(result).toEqual({ message: "Updated your team & project" });

        const updated = ctx.drizzle.select().from(teams).where(eq(teams.id, team.id)).get();
        expect(updated!.name).toBe("New Name");
        expect(updated!.project_name).toBe("Cool Project");
        expect(updated!.project_demo_url).toBe("https://demo.example.com");
    });

    it("returns 403 when project is already submitted", async () => {
        const team = seedTeam(ctx, { name: "Submitted Team", project_submitted: 1 });
        seedUser(ctx, { email: "user@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = { name: "New Name" };

        await expect(patchHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });
});

describe("POST /api/teams/:id/submit", () => {
    it("submits a project for the team", async () => {
        const team = seedTeam(ctx, { name: "My Team", pathway: "junior" });
        seedUser(ctx, { email: "user@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = {
            pathway: "junior",
            project: {
                name: "Awesome Project",
                description: "This is a really awesome project that we built over the weekend.",
                demo_url: "https://demo.example.com",
                repo_url: "https://github.com/example/repo",
            },
        };

        const result = await submitHandler(createEvent());

        expect(result).toEqual({ message: "Successfully submitted project" });

        const updated = ctx.drizzle.select().from(teams).where(eq(teams.id, team.id)).get();
        expect(updated!.project_submitted).toBe(1);
        expect(updated!.project_name).toBe("Awesome Project");
    });

    it("returns 403 when user is not a team member", async () => {
        const team = seedTeam(ctx, { name: "Other Team" });
        seedUser(ctx, { email: "user@basischina.com", team_id: null });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = {
            pathway: "junior",
            project: {
                name: "X",
                description: "This is a really awesome project that we built.",
                demo_url: "https://demo.example.com",
                repo_url: "https://github.com/example/repo",
            },
        };

        await expect(submitHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });
});

describe("GET /api/teams/:id/users", () => {
    it("returns 401 when not authenticated", async () => {
        (globalThis as any).requireUser.mockRejectedValue({
            statusCode: 401,
            message: "Unauthorized",
        });

        const team = seedTeam(ctx, { name: "Team" });
        mockParams.values["id"] = String(team.id);

        await expect(membersHandler(createEvent())).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it("returns team members", async () => {
        const team = seedTeam(ctx, { name: "Team" });
        seedUser(ctx, { email: "alice@basischina.com", name: "Alice", team_id: team.id });
        seedUser(ctx, { email: "bob@basischina.com", name: "Bob", team_id: team.id });

        mockParams.values["id"] = String(team.id);

        const result = await membersHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty("name", "Alice");
        expect(result[1]).toHaveProperty("name", "Bob");
    });

    it("only exposes id, email, name, and team_id", async () => {
        const team = seedTeam(ctx, { name: "Team" });
        seedUser(ctx, {
            email: "alice@basischina.com",
            name: "Alice",
            team_id: team.id,
            role: "participant",
            profile_theme: "emoji|🚀",
            profile_picture: "https://example.com/avatar.png",
        });

        mockParams.values["id"] = String(team.id);

        const result = await membersHandler(createEvent());

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            id: 1,
            email: "alice@basischina.com",
            name: "Alice",
            team_id: team.id,
        });
    });
});

describe("POST /api/teams/:id/users", () => {
    it("adds a user to the team by email", async () => {
        const team = seedTeam(ctx, { name: "Team" });
        seedUser(ctx, { email: "owner@basischina.com", name: "Owner", team_id: team.id });
        const newMember = seedUser(ctx, {
            email: "newbie@basischina.com",
            name: "Newbie",
            team_id: null,
        });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = { email: "newbie@basischina.com" };

        const result = await addMemberHandler(createEvent());

        expect(result).toEqual({ message: "Added user to the team" });

        const updated = ctx.drizzle.select().from(users).where(eq(users.id, newMember.id)).get();
        expect(updated!.team_id).toBe(team.id);
    });

    it("returns 404 when target user is not found", async () => {
        const team = seedTeam(ctx, { name: "Team" });
        seedUser(ctx, { email: "owner@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = { email: "nobody@basischina.com" };

        await expect(addMemberHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });
});

describe("DELETE /api/teams/:id/users/:user", () => {
    it("removes a user from the team", async () => {
        const team = seedTeam(ctx, { name: "Team" });
        seedUser(ctx, { email: "owner@basischina.com", team_id: team.id });
        const member = seedUser(ctx, { email: "member@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockParams.values["user"] = String(member.id);

        const result = await removeMemberHandler(createEvent());

        expect(result).toEqual({ message: "Removed user from the team" });

        const updated = ctx.drizzle.select().from(users).where(eq(users.id, member.id)).get();
        expect(updated!.team_id).toBeNull();
    });
});
