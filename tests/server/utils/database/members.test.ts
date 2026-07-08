import { createMockEvent } from "./helpers";
import {
    getTeamMembers,
    getAllTeamMembers,
    getUserPastTeams,
    addUserPastTeam,
    removeTeamMember,
    addTeamMember,
} from "~~/server/utils/database/members";

describe("members database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
        // Seed hackathon, season, and team
        event.context.drizzle
            .prepare(
                "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
            )
            .run();
        event.context.drizzle.prepare("INSERT INTO seasons(name, is_active) VALUES('S1', 1)").run();
        event.context.drizzle
            .prepare("INSERT INTO teams(name, season_id) VALUES('Team A', 1)")
            .run();
        event.context.drizzle
            .prepare("INSERT INTO teams(name, season_id) VALUES('Team B', 1)")
            .run();
        // Seed users
        event.context.drizzle
            .prepare(
                "INSERT INTO users(email, name, team_id) VALUES('alice@example.com', 'Alice', 1)",
            )
            .run();
        event.context.drizzle
            .prepare("INSERT INTO users(email, name, team_id) VALUES('bob@example.com', 'Bob', 1)")
            .run();
        event.context.drizzle
            .prepare(
                "INSERT INTO users(email, name, team_id) VALUES('carol@example.com', 'Carol', NULL)",
            )
            .run();
    });

    describe("getTeamMembers", () => {
        it("returns the current members of a team", async () => {
            const members = await getTeamMembers(event, 1);
            expect(members).toHaveLength(2);
            expect(members.map((m) => m.name)).toEqual(["Alice", "Bob"]);
        });

        it("returns an empty array for a team with no members", async () => {
            const members = await getTeamMembers(event, 2);
            expect(members).toHaveLength(0);
        });
    });

    describe("getAllTeamMembers", () => {
        it("includes past team members alongside current members", async () => {
            // Add Carol as a past team member of Team A
            event.context.drizzle
                .prepare("INSERT INTO user_past_teams(user_id, team_id) VALUES(3, 1)")
                .run();

            const members = await getAllTeamMembers(event, 1);
            expect(members).toHaveLength(3);
            expect(members.map((m) => m.name)).toEqual(["Alice", "Bob", "Carol"]);
        });

        it("deduplicates a current member who also has past-team history", async () => {
            // Alice is a current member of Team A and also has a past-team record
            event.context.drizzle
                .prepare("INSERT INTO user_past_teams(user_id, team_id) VALUES(1, 1)")
                .run();

            const members = await getAllTeamMembers(event, 1);
            expect(members).toHaveLength(2);
            expect(members.map((m) => m.name)).toEqual(["Alice", "Bob"]);
        });
    });

    describe("getUserPastTeams", () => {
        it("returns past teams for a user", async () => {
            event.context.drizzle
                .prepare("INSERT INTO user_past_teams(user_id, team_id) VALUES(1, 2)")
                .run();

            const teams = await getUserPastTeams(event, 1);
            expect(teams).toHaveLength(1);
            expect(teams[0]!.id).toBe(2);
            expect(teams[0]!.name).toBe("Team B");
        });

        it("returns an empty array when the user has no past teams", async () => {
            const teams = await getUserPastTeams(event, 1);
            expect(teams).toHaveLength(0);
        });
    });

    describe("addUserPastTeam", () => {
        it("adds a past team record successfully", async () => {
            await addUserPastTeam(event, 1, 2);

            const teams = await getUserPastTeams(event, 1);
            expect(teams).toHaveLength(1);
            expect(teams[0]!.id).toBe(2);
        });

        it("ignores duplicate insert", async () => {
            await addUserPastTeam(event, 1, 2);
            await addUserPastTeam(event, 1, 2); // Should not throw

            const teams = await getUserPastTeams(event, 1);
            expect(teams).toHaveLength(1);
        });
    });

    describe("removeTeamMember", () => {
        it("removes a member from a team and records the past team", async () => {
            await removeTeamMember(event, 1, 1);

            // Alice should no longer be on Team A
            const members = await getTeamMembers(event, 1);
            expect(members).toHaveLength(1);
            expect(members[0]!.name).toBe("Bob");

            // Alice should have Team A in her past teams
            const pastTeams = await getUserPastTeams(event, 1);
            expect(pastTeams).toHaveLength(1);
            expect(pastTeams[0]!.id).toBe(1);
        });

        it("throws a 404 error when the user is not in the team", async () => {
            await expect(removeTeamMember(event, 1, 3)).rejects.toThrow(
                "User not found or not in team",
            );

            // Removing a non-member must not create a past-team entry
            const pastTeams = event.context.drizzle
                .prepare("SELECT * FROM user_past_teams WHERE user_id = 3 AND team_id = 1")
                .all();
            expect(pastTeams.results).toHaveLength(0);
        });
    });

    describe("addTeamMember", () => {
        it("adds a user to a team successfully", async () => {
            await addTeamMember(event, 1, 3);

            const members = await getTeamMembers(event, 1);
            expect(members).toHaveLength(3);
            expect(members.map((m) => m.name)).toContain("Carol");
        });

        it("throws a 404 error when the user is already in a team", async () => {
            await expect(addTeamMember(event, 1, 1)).rejects.toThrow(
                "User not found or already in a team",
            );
        });
    });
});
