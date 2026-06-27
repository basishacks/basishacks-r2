import type { ResolvedAward } from "./database/awards";

function parseProfileTheme(input?: string): ProfileTheme {
    const [rawMode, rawValue] = (input ?? "").split("|");

    const allowedModes: ProfileTheme["mode"][] = ["url", "emoji", "gradient"];

    const mode: ProfileTheme["mode"] = allowedModes.includes(rawMode as any)
        ? (rawMode as ProfileTheme["mode"])
        : "emoji"; // default fallback

    const value: string = rawValue ?? "";

    return { mode, value };
}

export function convertUserToPublic(user: User): APIUser {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        team_id: user.team_id,
        profile_theme: parseProfileTheme(user.profile_theme ?? undefined),
        profile_picture: user.profile_picture,
    };
}

export function convertTeamToPublic(
    team: Team,
    withScore: boolean = false,
    awards: ResolvedAward[] = [],
): APITeam {
    return {
        id: team.id,
        name: team.name,
        pathway: team.pathway,
        rank: team.rank,
        score: withScore ? team.score : null,
        season_id: team.season_id,
        project: {
            name: team.project_name,
            description: team.project_description,
            demo_url: team.project_demo_url,
            repo_url: team.project_repo_url,
            submitted: team.project_submitted ? true : false,
            sourcing: team.sourcing,
        },
        awards: awards.map(({ team_id, ...award }) => award),
    };
}
