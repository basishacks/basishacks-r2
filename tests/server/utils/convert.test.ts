import { convertUserToPublic, convertTeamToPublic } from "~~/server/utils/convert";

describe("convert utilities", () => {
    it("convertUserToPublic keeps numeric ids and parses profile theme", () => {
        const user: any = {
            id: 42,
            email: "test@example.com",
            role: "participant",
            name: "Test User",
            team_id: 7,
            profile_theme: "gradient|blue",
            profile_picture: null,
        };

        const result = convertUserToPublic(user);
        expect(result.id).toBe(42);
        expect(typeof result.id).toBe("number");
        expect(result.profile_theme).toEqual({ mode: "gradient", value: "blue" });
    });

    it("convertTeamToPublic coerces project_submitted to boolean and includes awards", () => {
        const team: any = {
            id: 1,
            name: "Team A",
            pathway: "senior",
            rank: 2,
            score: 95,
            season_id: 1,
            project_name: "P",
            project_description: "desc",
            project_demo_url: "https://demo",
            project_repo_url: "https://repo",
            project_submitted: 1,
            sourcing: null,
        };

        const result = convertTeamToPublic(team, true, [
            { id: 1, team_id: 1, text: ["Best", "Design"], created_at: 0 },
        ] as any);
        expect(result.id).toBe(1);
        expect(result.project.submitted).toBe(true);
        expect(result.awards[0].text).toBe("Best, Design");
    });

    it("parseProfileTheme preserves the full value when it contains pipes", () => {
        const user: any = {
            id: 1,
            email: "a@b.com",
            role: "participant",
            name: null,
            team_id: null,
            profile_theme: "url|http://example.com/image?a=1|b=2",
            profile_picture: null,
        };
        const result = convertUserToPublic(user);
        expect(result.profile_theme).toEqual({
            mode: "url",
            value: "http://example.com/image?a=1|b=2",
        });
    });
});
