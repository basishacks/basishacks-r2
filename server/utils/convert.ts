export function convertUserToPublic(user: User): APIUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    team_id: user.team_id,
    profile_theme: user.profile_theme
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
