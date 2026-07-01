import type { ResolvedAward } from './database/awards'

function parseProfileTheme(input?: string): ProfileTheme {
  const str = input ?? ""
  const sepIndex = str.indexOf("|")
  const rawMode = sepIndex === -1 ? str : str.slice(0, sepIndex)
  const rawValue = sepIndex === -1 ? "" : str.slice(sepIndex + 1)

  const allowedModes: ProfileTheme["mode"][] = ["url", "emoji", "gradient"]

  const mode: ProfileTheme["mode"] = allowedModes.includes(rawMode as any)
    ? (rawMode as ProfileTheme["mode"])
    : "emoji" // default fallback

  return { mode, value: rawValue }
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
  }
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
    awards: awards.map(({ team_id, text, ...award }) => ({
      ...award,
      text: Array.isArray(text) ? text.join(', ') : (text ?? ''),
    })),
  }
}
