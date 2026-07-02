import type { H3Event } from 'h3'
import { eq, and, inArray, sql } from 'drizzle-orm'
import {
  users,
  teamScores,
  ballots,
  ballotScores,
  userPastTeams,
  peerVotingScores,
  scVotes,
  oauth2Applications,
} from '~~/server/database/schema'
import { hasPermission } from '~~/shared/permissions'

export async function getUser(
  event: H3Event,
  userID: number
): Promise<User | null> {
  const row = event.context.drizzle
    .select()
    .from(users)
    .where(eq(users.id, userID))
    .get()

  return row ?? null
}

export async function getUserByEmail(event: H3Event, email: string): Promise<User | null> {
  const row = event.context.drizzle
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .get()

  return row ?? null
}

export async function addCodeToUser(event: H3Event, email: string): Promise<User> {
  const oldUser = await getUserByEmail(event, email)
  if (
    oldUser?.login_expiry &&
    oldUser.login_expiry - 9 * 60 * 1000 > Date.now() &&
    !hasPermission(oldUser.role, 'admin') // Admins can request codes more frequently for testing purposes
  ) {

    throw createError({
      status: 403,
      message: 'Please wait 1 minute before requesting another code!',
    })
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiry = Date.now() + 10 * 60 * 1000

  // upsert user
  const user = event.context.drizzle
    .insert(users)
    .values({ email: email.toLowerCase(), login_code: code, login_expiry: expiry })
    .onConflictDoUpdate({
      target: users.email,
      set: { login_code: code, login_expiry: expiry },
    })
    .returning()
    .get()!

  return user
}

export async function updateUserName(event: H3Event, user: User) {
  const result = event.context.drizzle
    .update(users)
    .set({ name: user.name })
    .where(eq(users.id, user.id))
    .run()

  if (result.changes === 0) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
}

export async function updateUserProfileTheme(event: H3Event, user: User) {
  const result = event.context.drizzle
    .update(users)
    .set({ profile_theme: user.profile_theme })
    .where(eq(users.id, user.id))
    .run()

  if (result.changes === 0) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
}

export async function updateUserProfilePicture(event: H3Event, user: User) {
  const result = event.context.drizzle
    .update(users)
    .set({ profile_picture: user.profile_picture })
    .where(eq(users.id, user.id))
    .run()

  if (result.changes === 0) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
}

export async function updateUserRole(event: H3Event, userID: number, role: string) {
  const result = event.context.drizzle
    .update(users)
    .set({ role })
    .where(eq(users.id, userID))
    .run()

  if (result.changes === 0) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
}

export async function deleteUsers(event: H3Event, userIDs: number[]) {
  for (const id of userIDs) {
    event.context.drizzle.transaction((tx) => {
      tx.delete(teamScores)
        .where(eq(teamScores.judge_user_id, id))
        .run()

      tx.delete(ballotScores)
        .where(
          inArray(
            ballotScores.ballot_id,
            tx.select({ id: ballots.id }).from(ballots).where(eq(ballots.user_id, id)),
          ),
        )
        .run()

      tx.delete(ballots)
        .where(eq(ballots.user_id, id))
        .run()

      tx.delete(peerVotingScores)
        .where(eq(peerVotingScores.user_id, id))
        .run()

      tx.delete(scVotes)
        .where(eq(scVotes.user_id, id))
        .run()

      tx.delete(userPastTeams)
        .where(eq(userPastTeams.user_id, id))
        .run()

      tx.delete(oauth2Applications)
        .where(eq(oauth2Applications.owner_id, id))
        .run()

      tx.delete(users)
        .where(eq(users.id, id))
        .run()
    })
  }
}
