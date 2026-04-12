interface ProfileTheme {
  mode: "url" | "emoji" | "gradient"
  value: string | null
}

interface APIUser {
  id: number
  email: string
  role: UserRole
  name: string | null
  team_id: number | null
  profile_theme: ProfileTheme | null
}

interface APITeam {
  id: number
  name: string
  pathway: TeamPathway | null
  rank: number | null
  score: number | null
  project: {
    name: string
    description: string
    demo_url: string | null
    repo_url: string | null
    submitted: boolean
  },
}

interface GetUserResponse extends APIUser {
  team: APITeam | null
}

type CreateTeamResponse = APITeam

type GetTeamMembersResponse = {
  id: number
  email: string
  name: string | null
  team_id: number | null
}[]

interface UpdateUserResponse {
  message: string
}

interface GetBallotResponse {
  id: number
  projects: (APITeam['project'] & { id: number })[]
  scores: (1 | 2 | 3 | 4 | 5)[] | null
  reasoning: string | null
}
