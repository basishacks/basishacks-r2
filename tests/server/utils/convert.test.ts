import { convertUserToPublic, convertTeamToPublic } from '~~/server/utils/convert'
import type { ResolvedAward } from '~~/server/utils/database/awards'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'alice@basischina.com',
    role: 'participant',
    name: 'Alice',
    team_id: 42,
    login_code: null,
    login_expiry: null,
    profile_theme: 'emoji|🚀',
    profile_picture: 'alice.png',
    ...overrides,
  }
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 1,
    name: 'Byte Brigade',
    pathway: 'senior',
    score: 95,
    rank: 1,
    project_name: 'Cool Project',
    project_description: 'A very cool project',
    project_demo_url: 'https://demo.example.com',
    project_repo_url: 'https://github.com/example/cool',
    project_submitted: 1,
    sourcing: 'open-source',
    season_id: 2,
    ...overrides,
  }
}

function makeAward(overrides: Partial<ResolvedAward> = {}): ResolvedAward {
  return {
    team_id: 1,
    namespace: 'best_ux',
    name: 'Best UX',
    meta: {},
    text: 'Best UX Award',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// convertUserToPublic
// ---------------------------------------------------------------------------

describe('convertUserToPublic', () => {
  it('converts a normal user with all fields populated', () => {
    const user = makeUser()
    const result = convertUserToPublic(user)

    expect(result.id).toBe(1)
    expect(result.email).toBe('alice@basischina.com')
    expect(result.role).toBe('participant')
    expect(result.name).toBe('Alice')
    expect(result.team_id).toBe(42)
    expect(result.profile_picture).toBe('alice.png')
  })

  it('handles null name and team_id gracefully', () => {
    const user = makeUser({ name: null, team_id: null })
    const result = convertUserToPublic(user)

    expect(result.name).toBeNull()
    expect(result.team_id).toBeNull()
  })

  // -- profile_theme parsing --

  it('parses emoji mode from profile_theme', () => {
    const user = makeUser({ profile_theme: 'emoji|🚀' })
    const result = convertUserToPublic(user)

    expect(result.profile_theme).toEqual({ mode: 'emoji', value: '🚀' })
  })

  it('parses url mode from profile_theme', () => {
    const user = makeUser({ profile_theme: 'url|https://example.com/bg.png' })
    const result = convertUserToPublic(user)

    expect(result.profile_theme).toEqual({
      mode: 'url',
      value: 'https://example.com/bg.png',
    })
  })

  it('parses gradient mode from profile_theme', () => {
    const user = makeUser({ profile_theme: 'gradient|#ff0000,#00ff00' })
    const result = convertUserToPublic(user)

    expect(result.profile_theme).toEqual({
      mode: 'gradient',
      value: '#ff0000,#00ff00',
    })
  })

  it('returns emoji fallback for null profile_theme', () => {
    const user = makeUser({ profile_theme: null })
    const result = convertUserToPublic(user)

    // null input becomes "" which splits to ["", ""] → mode defaults to "emoji"
    expect(result.profile_theme).toEqual({ mode: 'emoji', value: '' })
  })

  it('returns emoji fallback for empty profile_theme string', () => {
    const user = makeUser({ profile_theme: '' })
    const result = convertUserToPublic(user)

    expect(result.profile_theme).toEqual({ mode: 'emoji', value: '' })
  })

  it('falls back to emoji mode for malformed profile_theme without a pipe', () => {
    const user = makeUser({ profile_theme: 'just-a-string' })
    const result = convertUserToPublic(user)

    expect(result.profile_theme).toEqual({ mode: 'emoji', value: '' })
  })

  it('falls back to emoji mode for an unrecognized mode string', () => {
    const user = makeUser({ profile_theme: 'unknown|something' })
    const result = convertUserToPublic(user)

    expect(result.profile_theme).toEqual({ mode: 'emoji', value: 'something' })
  })

  it('handles profile_theme with pipe but no value', () => {
    const user = makeUser({ profile_theme: 'emoji|' })
    const result = convertUserToPublic(user)

    expect(result.profile_theme).toEqual({ mode: 'emoji', value: '' })
  })

  it('handles profile_theme with multiple pipes (value contains pipes)', () => {
    const user = makeUser({ profile_theme: 'url|https://a.com|extra' })
    const result = convertUserToPublic(user)

    // split("|") on "url|https://a.com|extra" → ["url", "https://a.com", "extra"]
    // rawValue = "https://a.com" (only first two elements used)
    expect(result.profile_theme).toEqual({ mode: 'url', value: 'https://a.com' })
  })
})

// ---------------------------------------------------------------------------
// convertTeamToPublic
// ---------------------------------------------------------------------------

describe('convertTeamToPublic', () => {
  it('converts a normal team with scores included', () => {
    const team = makeTeam()
    const result = convertTeamToPublic(team, true)

    expect(result.id).toBe(1)
    expect(result.name).toBe('Byte Brigade')
    expect(result.pathway).toBe('senior')
    expect(result.rank).toBe(1)
    expect(result.score).toBe(95)
    expect(result.season_id).toBe(2)
    expect(result.project.name).toBe('Cool Project')
    expect(result.project.description).toBe('A very cool project')
    expect(result.project.demo_url).toBe('https://demo.example.com')
    expect(result.project.repo_url).toBe('https://github.com/example/cool')
    expect(result.project.submitted).toBe(true)
    expect(result.project.sourcing).toBe('open-source')
    expect(result.awards).toEqual([])
  })

  it('sets score to null when withScore is false (default)', () => {
    const team = makeTeam({ score: 95 })
    const result = convertTeamToPublic(team)

    expect(result.score).toBeNull()
  })

  it('includes score when withScore is true', () => {
    const team = makeTeam({ score: 88 })
    const result = convertTeamToPublic(team, true)

    expect(result.score).toBe(88)
  })

  it('handles null score gracefully', () => {
    const team = makeTeam({ score: null })
    const result = convertTeamToPublic(team, true)

    expect(result.score).toBeNull()
  })

  it('maps project_submitted=0 to submitted=false', () => {
    const team = makeTeam({ project_submitted: 0 })
    const result = convertTeamToPublic(team)

    expect(result.project.submitted).toBe(false)
  })

  it('maps project_submitted=1 to submitted=true', () => {
    const team = makeTeam({ project_submitted: 1 })
    const result = convertTeamToPublic(team)

    expect(result.project.submitted).toBe(true)
  })

  it('includes awards when provided', () => {
    const team = makeTeam()
    const awards = [
      makeAward({ namespace: 'best_ux', name: 'Best UX', text: 'Best UX Award' }),
      makeAward({ namespace: 'most_innovative', name: 'Most Innovative', text: 'Most Innovative Award' }),
    ]
    const result = convertTeamToPublic(team, false, awards)

    expect(result.awards).toHaveLength(2)
    expect(result.awards[0]).toEqual({
      namespace: 'best_ux',
      name: 'Best UX',
      meta: {},
      text: 'Best UX Award',
    })
    expect(result.awards[1]).toEqual({
      namespace: 'most_innovative',
      name: 'Most Innovative',
      meta: {},
      text: 'Most Innovative Award',
    })
  })

  it('strips team_id from awards (does not leak internal field)', () => {
    const team = makeTeam()
    const awards = [makeAward({ team_id: 99, namespace: 'best_ux', name: 'Best UX', text: 'Best UX' })]
    const result = convertTeamToPublic(team, false, awards)

    expect(result.awards[0]).not.toHaveProperty('team_id')
  })

  it('handles empty awards array', () => {
    const team = makeTeam()
    const result = convertTeamToPublic(team, false, [])

    expect(result.awards).toEqual([])
  })

  it('handles team with null pathway', () => {
    const team = makeTeam({ pathway: null })
    const result = convertTeamToPublic(team)

    expect(result.pathway).toBeNull()
  })

  it('handles team with null rank', () => {
    const team = makeTeam({ rank: null })
    const result = convertTeamToPublic(team)

    expect(result.rank).toBeNull()
  })

  it('handles null project URLs', () => {
    const team = makeTeam({ project_demo_url: null, project_repo_url: null })
    const result = convertTeamToPublic(team)

    expect(result.project.demo_url).toBeNull()
    expect(result.project.repo_url).toBeNull()
  })
})