// this file should contain the types exactly as defined in the database.

type HackathonStatus =
  | 'not_started' // before the event
  | 'in_progress' // during the event
  | 'voting' // after the event, peer voting
  | 'finished' // event completed
  | 'paused' // event paused for maintenance, etc.

type TeamPathway = 'junior' | 'senior'

interface Hackathon {
  id: 1
  status: HackathonStatus
  voting_enabled: number
  results_published: number
  submitted_count: number
  max_votes_per_user: number
  judging_open: number
  schedule_start: string | null
  schedule_end: string | null
  start_timestamp: number
  end_timestamp: number
  voting_start_timestamp: number
  voting_end_timestamp: number
  results_open_timestamp: number
  theme_name: string | null
  theme_description: string | null
}

interface Team {
  id: number
  name: string
  pathway: TeamPathway | null
  score: number | null
  rank: number | null
  project_name: string
  project_description: string
  project_demo_url: string | null
  project_repo_url: string | null
  project_submitted: number,
}

interface TeamScores {
  id: number
  team_id: number
  judge_user_id: number
  scores: string
  reasoning: string
}

interface User {
  id: number
  email: string
  role: string
  name: string | null
  team_id: number | null
  login_code: string | null
  login_expiry: number | null
  profile_theme: string | null
  profile_picture: string | null
}

interface Ballot {
  id: number
  user_id: number
  reasoning: string | null
  submitted: number
}

interface BallotScore {
  id: number
  ballot_id: number
  project_id: number
  score: 1 | 2 | 3 | 4 | 5 | null
}

interface OAuth2Application {
    client_id: string,
    client_secret: string, 
    redirect_uris: string | null,
    permissions: string | null,
    name: string,
    description: string | null
    proxy_microsoft: number
    type: "first" | "third"
    profile_picture: string | null
    owner_id: number | null
}