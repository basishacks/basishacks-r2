function parseProfileTheme(input?: string): ProfileTheme {
  const [rawMode, rawValue] = (input ?? "").split("|")

  const allowedModes: ProfileTheme["mode"][] = ["url", "emoji", "gradient"]

  const mode: ProfileTheme["mode"] = allowedModes.includes(rawMode as any)
    ? (rawMode as ProfileTheme["mode"])
    : "emoji" // default fallback

  const value: string = rawValue ?? ""

  return { mode, value }
}

export function convertUserToPublic(user: User): APIUser | null {

  if (user.profile_theme?.split("|").length != 2) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    team_id: user.team_id,
    profile_theme: parseProfileTheme(user.profile_theme)
  }
}

export function convertTeamToPublic(
  team: Team,
  withScore: boolean = false,
): APITeam {
  return {
    id: team.id,
    name: team.name,
    pathway: team.pathway,
    rank: team.rank,
    score: withScore ? team.score : null,
    project: {
      name: team.project_name,
      description: team.project_description,
      demo_url: team.project_demo_url,
      repo_url: team.project_repo_url,
      submitted: team.project_submitted ? true : false,
    },
  }
}
