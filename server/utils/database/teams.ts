import type { H3Event } from 'h3'
import { eq, and, notExists } from 'drizzle-orm'
import { teams, teamScores, ballotScores, users } from '~~/server/database/schema'

// --- Active season filtered (default behavior) ---

export async function getTeam(event: H3Event, teamID: number, allSeason?: boolean): Promise<Team | null> {
  if (allSeason) {
    const row = event.context.drizzle
      .select()
      .from(teams)
      .where(eq(teams.id, teamID))
      .get()

    return row ?? null
  }
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1
  const row = event.context.drizzle
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamID), eq(teams.season_id, seasonId)))
    .get()

  return row ?? null
}

export async function getAllTeams(event: H3Event): Promise<Team[]> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1
  return event.context.drizzle
    .select()
    .from(teams)
    .where(eq(teams.season_id, seasonId))
    .all()
}

export async function getSubmittedUnjudgedTeams(
  event: H3Event,
  judgeUserID: number,
): Promise<Team[]> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1

  const subquery = event.context.drizzle
    .select({ team_id: teamScores.team_id })
    .from(teamScores)
    .where(
      and(
        eq(teamScores.judge_user_id, judgeUserID),
        eq(teamScores.team_id, teams.id),
      ),
    )

  return event.context.drizzle
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.season_id, seasonId),
        eq(teams.project_submitted, 1),
        notExists(subquery),
      ),
    )
    .all()
}

export async function getSubmittedTeams(event: H3Event): Promise<Team[]> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1
  return event.context.drizzle
    .select()
    .from(teams)
    .where(and(eq(teams.season_id, seasonId), eq(teams.project_submitted, 1)))
    .all()
}

// --- Unrestricted / by season ---

export async function getTeamById(event: H3Event, teamID: number): Promise<Team | null> {
  const row = event.context.drizzle
    .select()
    .from(teams)
    .where(eq(teams.id, teamID))
    .get()

  return row ?? null
}

export async function getTeamBySeason(event: H3Event, teamID: number, seasonId: number): Promise<Team | null> {
  const row = event.context.drizzle
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamID), eq(teams.season_id, seasonId)))
    .get()

  return row ?? null
}

export async function getAllTeamsAllSeasons(event: H3Event): Promise<Team[]> {
  return event.context.drizzle
    .select()
    .from(teams)
    .all()
}

export async function getTeamsBySeason(event: H3Event, seasonId: number): Promise<Team[]> {
  return event.context.drizzle
    .select()
    .from(teams)
    .where(eq(teams.season_id, seasonId))
    .all()
}

// --- Mutations ---

export async function createTeam(event: H3Event, teamName: string): Promise<Team> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id
  if (!seasonId) {
    throw createError({
      status: 403,
      message: 'No active season',
    })
  }

  const team = event.context.drizzle
    .insert(teams)
    .values({ name: teamName, season_id: seasonId })
    .returning()
    .get()!

  return team
}

export async function updateTeam(event: H3Event, team: Team) {
  const result = event.context.drizzle
    .update(teams)
    .set({
      name: team.name,
      pathway: team.pathway,
      score: team.score,
      rank: team.rank,
      project_name: team.project_name,
      project_description: team.project_description,
      project_demo_url: team.project_demo_url,
      project_repo_url: team.project_repo_url,
      project_submitted: team.project_submitted,
      sourcing: team.sourcing,
      season_id: team.season_id,
    })
    .where(eq(teams.id, team.id))
    .run()

  if (result.changes === 0) {
    throw createError({
      status: 404,
      message: 'Team not found',
    })
  }
}

export async function deleteTeams(event: H3Event, teamIDs: number[]) {
  for (const id of teamIDs) {
    event.context.drizzle
      .delete(ballotScores)
      .where(eq(ballotScores.project_id, id))
      .run()

    event.context.drizzle
      .delete(teamScores)
      .where(eq(teamScores.team_id, id))
      .run()

    event.context.drizzle
      .update(users)
      .set({ team_id: null })
      .where(eq(users.team_id, id))
      .run()

    event.context.drizzle
      .delete(teams)
      .where(eq(teams.id, id))
      .run()
  }
}