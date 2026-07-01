import { createMockEvent } from './helpers'
import {
  getUser,
  getUserByEmail,
  addCodeToUser,
  getUserByCode,
  updateUserName,
  updateUserProfileTheme,
  updateUserProfilePicture,
  updateUserRole,
  deleteUsers,
} from '~~/server/utils/database/users'

describe('users database helpers', () => {
  let event: ReturnType<typeof createMockEvent>

  beforeEach(() => {
    event = createMockEvent()
  })

  describe('getUser', () => {
    it('returns the user when the user exists', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, name) VALUES('test@example.com', 'Test User')",
      ).run()

      const user = await getUser(event, 1)
      expect(user).not.toBeNull()
      expect(user!.email).toBe('test@example.com')
      expect(user!.name).toBe('Test User')
    })

    it('returns null when the user does not exist', async () => {
      const user = await getUser(event, 999)
      expect(user).toBeNull()
    })
  })

  describe('getUserByEmail', () => {
    it('returns the user when found by email (case insensitive)', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, name) VALUES('test@example.com', 'Test User')",
      ).run()

      const user = await getUserByEmail(event, 'TEST@EXAMPLE.COM')
      expect(user).not.toBeNull()
      expect(user!.email).toBe('test@example.com')
    })

    it('returns null when no user has the given email', async () => {
      const user = await getUserByEmail(event, 'nobody@example.com')
      expect(user).toBeNull()
    })
  })

  describe('addCodeToUser', () => {
    it('creates a new user and sets a login code and expiry', async () => {
      const user = await addCodeToUser(event, 'new@example.com')
      expect(user).not.toBeNull()
      expect(user.email).toBe('new@example.com')
      expect(user.login_code).not.toBeNull()
      expect(user.login_code!.length).toBe(6)
      expect(user.login_expiry).toBeGreaterThan(Date.now())
    })

    it('updates the login code for an existing user', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, role) VALUES('existing@example.com', 'admin')",
      ).run()

      const firstCall = await addCodeToUser(event, 'existing@example.com')
      const firstCode = firstCall.login_code

      const secondCall = await addCodeToUser(event, 'existing@example.com')
      // Should have a new code (random, so very unlikely to match)
      expect(secondCall.login_code).toBeDefined()
    })

    it('throws a 403 error when requesting a code within 9 minutes for a non-admin user', async () => {
      // Create a user with a recent login_expiry
      const recentExpiry = Date.now() + 10 * 60 * 1000 // 10 minutes from now
      event.context.db.prepare(
        "INSERT INTO users(email, login_code, login_expiry, role) VALUES('rate-limited@example.com', '123456', ?, 'participant')",
      ).bind(recentExpiry).run()

      await expect(
        addCodeToUser(event, 'rate-limited@example.com'),
      ).rejects.toThrow('Please wait 1 minute before requesting another code!')
    })

    it('allows admin users to request a code even within the rate limit window', async () => {
      const recentExpiry = Date.now() + 10 * 60 * 1000
      event.context.db.prepare(
        "INSERT INTO users(email, login_code, login_expiry, role) VALUES('admin@example.com', '123456', ?, 'admin')",
      ).bind(recentExpiry).run()

      const user = await addCodeToUser(event, 'admin@example.com')
      expect(user.login_code).toBeDefined()
      // Admin should get a new code, not the old one
      expect(user.login_code).not.toBe('123456')
    })
  })

  describe('getUserByCode', () => {
    it('returns the user id when the code matches and clears the code', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, login_code, login_expiry) VALUES('user@example.com', '654321', ?)",
      ).bind(Date.now() + 10 * 60 * 1000).run()

      const result = await getUserByCode(event, 'user@example.com', '654321')
      expect(result).not.toBeNull()
      expect(result!.id).toBe(1)

      // Verify the code was cleared
      const user = await getUserByEmail(event, 'user@example.com')
      expect(user!.login_code).toBeNull()
    })

    it('returns null when the code does not match', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, login_code, login_expiry) VALUES('user@example.com', '999999', ?)",
      ).bind(Date.now() + 10 * 60 * 1000).run()

      const result = await getUserByCode(event, 'user@example.com', '000000')
      expect(result).toBeNull()
    })

    it('returns null when the email does not match', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, login_code, login_expiry) VALUES('user@example.com', '111111', ?)",
      ).bind(Date.now() + 10 * 60 * 1000).run()

      const result = await getUserByCode(event, 'wrong@example.com', '111111')
      expect(result).toBeNull()
    })

    it('returns null when the code has expired and leaves the code intact', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, login_code, login_expiry) VALUES('user@example.com', '222222', ?)",
      ).bind(Date.now() - 1).run()

      const result = await getUserByCode(event, 'user@example.com', '222222')
      expect(result).toBeNull()

      // Expired codes should not be consumed by a failed validation
      const user = await getUserByEmail(event, 'user@example.com')
      expect(user!.login_code).toBe('222222')
    })
  })

  describe('updateUserName', () => {
    it('updates the user name successfully', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, name) VALUES('user@example.com', 'Old Name')",
      ).run()

      await updateUserName(event, {
        id: 1,
        name: 'New Name',
      } as any)

      const user = await getUser(event, 1)
      expect(user!.name).toBe('New Name')
    })

    it('throws a 404 error when the user does not exist', async () => {
      await expect(
        updateUserName(event, { id: 999, name: 'Ghost' } as any),
      ).rejects.toThrow('User not found')
    })
  })

  describe('updateUserProfileTheme', () => {
    it('updates the profile theme successfully', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email) VALUES('user@example.com')",
      ).run()

      await updateUserProfileTheme(event, {
        id: 1,
        profile_theme: 'dark|blue',
      } as any)

      const user = await getUser(event, 1)
      expect(user!.profile_theme).toBe('dark|blue')
    })

    it('throws a 404 error when the user does not exist', async () => {
      await expect(
        updateUserProfileTheme(event, {
          id: 999,
          profile_theme: 'dark|blue',
        } as any),
      ).rejects.toThrow('User not found')
    })
  })

  describe('updateUserProfilePicture', () => {
    it('updates the profile picture successfully', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email) VALUES('user@example.com')",
      ).run()

      await updateUserProfilePicture(event, {
        id: 1,
        profile_picture: '/avatars/test.png',
      } as any)

      const user = await getUser(event, 1)
      expect(user!.profile_picture).toBe('/avatars/test.png')
    })

    it('throws a 404 error when the user does not exist', async () => {
      await expect(
        updateUserProfilePicture(event, {
          id: 999,
          profile_picture: '/avatars/test.png',
        } as any),
      ).rejects.toThrow('User not found')
    })
  })

  describe('updateUserRole', () => {
    it('updates the user role successfully', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email, role) VALUES('user@example.com', 'participant')",
      ).run()

      await updateUserRole(event, 1, 'judge')

      const user = await getUser(event, 1)
      expect(user!.role).toBe('judge')
    })

    it('throws a 404 error when the user does not exist', async () => {
      await expect(updateUserRole(event, 999, 'admin')).rejects.toThrow(
        'User not found',
      )
    })
  })

  describe('deleteUsers', () => {
    it('deletes a single user', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email) VALUES('user@example.com')",
      ).run()

      await deleteUsers(event, [1])

      const user = await getUser(event, 1)
      expect(user).toBeNull()
    })

    it('deletes multiple users', async () => {
      event.context.db.prepare(
        "INSERT INTO users(email) VALUES('user1@example.com')",
      ).run()
      event.context.db.prepare(
        "INSERT INTO users(email) VALUES('user2@example.com')",
      ).run()
      event.context.db.prepare(
        "INSERT INTO users(email) VALUES('user3@example.com')",
      ).run()

      await deleteUsers(event, [1, 3])

      expect(await getUser(event, 1)).toBeNull()
      expect(await getUser(event, 2)).not.toBeNull()
      expect(await getUser(event, 3)).toBeNull()
    })

    it('cleans up related records when deleting a user', async () => {
      // Insert a hackathon row for FK constraints
      event.context.db.prepare(
        "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
      ).run()

      // Insert a season and team
      event.context.db.prepare(
        "INSERT INTO seasons(name, is_active) VALUES('S1', 1)",
      ).run()
      event.context.db.prepare(
        "INSERT INTO teams(name, season_id) VALUES('Team A', 1)",
      ).run()

      // Insert user
      event.context.db.prepare(
        "INSERT INTO users(id, email) VALUES(1, 'user@example.com')",
      ).run()

      // Create a ballot and team_scores entry for the user
      event.context.db.prepare(
        'INSERT INTO ballots(user_id) VALUES(1)',
      ).run()
      event.context.db.prepare(
        "INSERT INTO team_scores(team_id, judge_user_id, scores) VALUES(1, 1, '{}')",
      ).run()
      event.context.db.prepare(
        'INSERT INTO user_past_teams(user_id, team_id) VALUES(1, 1)',
      ).run()

      await deleteUsers(event, [1])

      // User should be gone
      expect(await getUser(event, 1)).toBeNull()

      // Related records should be cleaned up
      const teamScores = event.context.db.prepare(
        'SELECT * FROM team_scores WHERE judge_user_id = 1',
      ).all() as { results: any[] }
      expect(teamScores.results).toHaveLength(0)

      const ballots = event.context.db.prepare(
        'SELECT * FROM ballots WHERE user_id = 1',
      ).all() as { results: any[] }
      expect(ballots.results).toHaveLength(0)

      const pastTeams = event.context.db.prepare(
        'SELECT * FROM user_past_teams WHERE user_id = 1',
      ).all() as { results: any[] }
      expect(pastTeams.results).toHaveLength(0)
    })
  })
})