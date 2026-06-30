import {
  SendCodeRequest,
  LoginRequest,
  MicrosoftRedirectRequest,
  CreateTeamQuery,
  CreateTeamRequest,
  UpdateTeamRequest,
  SubmitTeamRequest,
  AddTeamMemberRequest,
  UpdateUserRequest,
  CreateTeamScoresRequest,
  SubmitVoteRequest,
  CreateApplicationRequest,
  ManageRedirectUriRequest,
  OAuth2TokenRequest,
  OAuth2SessionActionRequest,
  SetActiveSeasonRequest,
  ElectionVoteRequest,
} from '~~/shared/schemas'

describe('SendCodeRequest', () => {
  it('accepts a valid @basischina.com email', () => {
    expect(() => SendCodeRequest.parse({ email: 'test@basischina.com' })).not.toThrow()
  })

  it('accepts a valid @basischina.com email with mixed case', () => {
    expect(() => SendCodeRequest.parse({ email: 'Test@BASISChina.com' })).not.toThrow()
  })

  it('rejects a non-basis email', () => {
    expect(() => SendCodeRequest.parse({ email: 'test@gmail.com' })).toThrow()
  })

  it('rejects an invalid email format', () => {
    expect(() => SendCodeRequest.parse({ email: 'not-an-email' })).toThrow()
  })

  it('rejects an empty string', () => {
    expect(() => SendCodeRequest.parse({ email: '' })).toThrow()
  })
})

describe('LoginRequest', () => {
  it('accepts a valid email and 6-digit code', () => {
    expect(() =>
      LoginRequest.parse({ email: 'test@basischina.com', code: [1, 2, 3, 4, 5, 6] }),
    ).not.toThrow()
  })

  it('rejects an invalid email', () => {
    expect(() =>
      LoginRequest.parse({ email: 'test@gmail.com', code: [1, 2, 3, 4, 5, 6] }),
    ).toThrow()
  })

  it('rejects a code shorter than 6 digits', () => {
    expect(() =>
      LoginRequest.parse({ email: 'test@basischina.com', code: [1, 2, 3] }),
    ).toThrow()
  })

  it('rejects a code longer than 6 digits', () => {
    expect(() =>
      LoginRequest.parse({ email: 'test@basischina.com', code: [1, 2, 3, 4, 5, 6, 7] }),
    ).toThrow()
  })

  it('rejects a code with non-numeric values', () => {
    expect(() =>
      LoginRequest.parse({ email: 'test@basischina.com', code: 'abcdef' }),
    ).toThrow()
  })

  it('rejects a code with digits above 9', () => {
    expect(() =>
      LoginRequest.parse({ email: 'test@basischina.com', code: [10, 2, 3, 4, 5, 6] }),
    ).toThrow()
  })
})

describe('MicrosoftRedirectRequest', () => {
  it('accepts a valid token', () => {
    expect(() => MicrosoftRedirectRequest.parse({ token: 'abc123' })).not.toThrow()
  })

  it('accepts a long token', () => {
    expect(() => MicrosoftRedirectRequest.parse({ token: 'a'.repeat(1000) })).not.toThrow()
  })

  it('rejects an empty token', () => {
    expect(() => MicrosoftRedirectRequest.parse({ token: '' })).toThrow()
  })

  it('rejects a missing token', () => {
    expect(() => MicrosoftRedirectRequest.parse({})).toThrow()
  })
})

describe('CreateTeamQuery', () => {
  it('accepts add=true', () => {
    const result = CreateTeamQuery.parse({ add: 'true' })
    expect(result.add).toBe(true)
  })

  it('accepts add=false', () => {
    const result = CreateTeamQuery.parse({ add: 'false' })
    expect(result.add).toBe(false)
  })

  it('has add as undefined when missing', () => {
    const result = CreateTeamQuery.parse({})
    expect(result.add).toBeUndefined()
  })

  it('rejects add with an invalid value', () => {
    expect(() => CreateTeamQuery.parse({ add: 'yes' })).toThrow()
  })
})

describe('CreateTeamRequest', () => {
  it('accepts a valid team name', () => {
    expect(() => CreateTeamRequest.parse({ name: 'My Team' })).not.toThrow()
  })

  it('accepts a 2-character name', () => {
    expect(() => CreateTeamRequest.parse({ name: 'AB' })).not.toThrow()
  })

  it('accepts a 30-character name', () => {
    expect(() => CreateTeamRequest.parse({ name: 'A'.repeat(30) })).not.toThrow()
  })

  it('rejects a name shorter than 2 characters', () => {
    expect(() => CreateTeamRequest.parse({ name: 'A' })).toThrow()
  })

  it('rejects a name longer than 30 characters', () => {
    expect(() => CreateTeamRequest.parse({ name: 'A'.repeat(31) })).toThrow()
  })

  it('rejects an empty name', () => {
    expect(() => CreateTeamRequest.parse({ name: '' })).toThrow()
  })
})

describe('UpdateTeamRequest', () => {
  it('accepts a valid name update', () => {
    expect(() => UpdateTeamRequest.parse({ name: 'New Name' })).not.toThrow()
  })

  it('accepts a valid pathway update', () => {
    expect(() => UpdateTeamRequest.parse({ pathway: 'junior' })).not.toThrow()
    expect(() => UpdateTeamRequest.parse({ pathway: 'senior' })).not.toThrow()
  })

  it('accepts an empty object', () => {
    expect(() => UpdateTeamRequest.parse({})).not.toThrow()
  })

  it('rejects an invalid pathway', () => {
    expect(() => UpdateTeamRequest.parse({ pathway: 'intermediate' })).toThrow()
  })

  it('accepts a valid project update', () => {
    expect(() =>
      UpdateTeamRequest.parse({
        project: {
          name: 'My Project',
          description: 'A description',
          demo_url: 'https://example.com',
          repo_url: 'https://github.com/user/repo',
        },
      }),
    ).not.toThrow()
  })

  it('transforms an empty string URL to null', () => {
    const result = UpdateTeamRequest.parse({
      project: {
        demo_url: '',
        repo_url: '',
      },
    })
    expect(result.project?.demo_url).toBeNull()
    expect(result.project?.repo_url).toBeNull()
  })

  it('preserves null and undefined URLs', () => {
    const resultWithNull = UpdateTeamRequest.parse({
      project: {
        demo_url: null,
        repo_url: undefined,
      },
    })
    expect(resultWithNull.project?.demo_url).toBeNull()
    expect(resultWithNull.project?.repo_url).toBeUndefined()
  })

  it('rejects a project name longer than 50 characters', () => {
    expect(() =>
      UpdateTeamRequest.parse({ project: { name: 'A'.repeat(51) } }),
    ).toThrow()
  })

  it('rejects a project description longer than 2000 characters', () => {
    expect(() =>
      UpdateTeamRequest.parse({ project: { description: 'A'.repeat(2001) } }),
    ).toThrow()
  })

  it('rejects an invalid demo URL', () => {
    expect(() =>
      UpdateTeamRequest.parse({ project: { demo_url: 'not-a-url' } }),
    ).toThrow()
  })
})

describe('SubmitTeamRequest', () => {
  it('accepts a valid submission', () => {
    expect(() =>
      SubmitTeamRequest.parse({
        pathway: 'junior',
        project: {
          name: 'Cool Project',
          description: 'A'.repeat(30),
          demo_url: 'https://example.com',
          repo_url: 'https://github.com/user/repo',
        },
      }),
    ).not.toThrow()
  })

  it('rejects a submission with missing project name', () => {
    expect(() =>
      SubmitTeamRequest.parse({
        pathway: 'junior',
        project: {
          name: '',
          description: 'A'.repeat(30),
          demo_url: 'https://example.com',
          repo_url: 'https://github.com/user/repo',
        },
      }),
    ).toThrow()
  })

  it('rejects a submission with too short description', () => {
    expect(() =>
      SubmitTeamRequest.parse({
        pathway: 'junior',
        project: {
          name: 'Cool Project',
          description: 'Too short',
          demo_url: 'https://example.com',
          repo_url: 'https://github.com/user/repo',
        },
      }),
    ).toThrow()
  })

  it('rejects a submission with invalid demo URL', () => {
    expect(() =>
      SubmitTeamRequest.parse({
        pathway: 'junior',
        project: {
          name: 'Cool Project',
          description: 'A'.repeat(30),
          demo_url: 'not-a-url',
          repo_url: 'https://github.com/user/repo',
        },
      }),
    ).toThrow()
  })

  it('rejects a submission with invalid repo URL', () => {
    expect(() =>
      SubmitTeamRequest.parse({
        pathway: 'junior',
        project: {
          name: 'Cool Project',
          description: 'A'.repeat(30),
          demo_url: 'https://example.com',
          repo_url: 'not-a-url',
        },
      }),
    ).toThrow()
  })

  it('rejects a submission with missing pathway', () => {
    expect(() =>
      SubmitTeamRequest.parse({
        project: {
          name: 'Cool Project',
          description: 'A'.repeat(30),
          demo_url: 'https://example.com',
          repo_url: 'https://github.com/user/repo',
        },
      }),
    ).toThrow()
  })
})

describe('AddTeamMemberRequest', () => {
  it('accepts a valid @basischina.com email', () => {
    expect(() => AddTeamMemberRequest.parse({ email: 'member@basischina.com' })).not.toThrow()
  })

  it('rejects a non-basis email', () => {
    expect(() => AddTeamMemberRequest.parse({ email: 'member@gmail.com' })).toThrow()
  })

  it('rejects an invalid email format', () => {
    expect(() => AddTeamMemberRequest.parse({ email: 'not-an-email' })).toThrow()
  })
})

describe('UpdateUserRequest', () => {
  it('accepts a valid name update', () => {
    expect(() => UpdateUserRequest.parse({ name: 'John Doe' })).not.toThrow()
  })

  it('accepts an empty object (no fields)', () => {
    expect(() => UpdateUserRequest.parse({})).not.toThrow()
  })

  it('accepts a profile_theme_image as null', () => {
    expect(() => UpdateUserRequest.parse({ profile_theme_image: null })).not.toThrow()
  })

  it('accepts a profile_theme_image as a data string', () => {
    expect(() =>
      UpdateUserRequest.parse({ profile_theme_image: 'data:image/png;base64,abc' }),
    ).not.toThrow()
  })

  it('accepts an avatar as null', () => {
    expect(() => UpdateUserRequest.parse({ avatar: null })).not.toThrow()
  })

  it('rejects a name longer than 30 characters', () => {
    expect(() => UpdateUserRequest.parse({ name: 'A'.repeat(31) })).toThrow()
  })

  it('rejects a profile_theme_image that is not a data string, null, or File', () => {
    expect(() => UpdateUserRequest.parse({ profile_theme_image: 'not-data-or-file' })).toThrow()
  })
})

describe('CreateTeamScoresRequest', () => {
  const validScores = {
    originality: 3,
    presentation: 3,
    technicality: 3,
    theme: 3,
    impact: 3,
  }

  it('accepts valid scores with reasoning', () => {
    expect(() =>
      CreateTeamScoresRequest.parse({
        reasoning: 'Good work overall',
        scores: validScores,
      }),
    ).not.toThrow()
  })

  it('rejects reasoning shorter than 10 characters', () => {
    expect(() =>
      CreateTeamScoresRequest.parse({
        reasoning: 'Short',
        scores: validScores,
      }),
    ).toThrow()
  })

  it('rejects reasoning longer than 2000 characters', () => {
    expect(() =>
      CreateTeamScoresRequest.parse({
        reasoning: 'A'.repeat(2001),
        scores: validScores,
      }),
    ).toThrow()
  })

  it('rejects a score below 0', () => {
    expect(() =>
      CreateTeamScoresRequest.parse({
        reasoning: 'Good work overall',
        scores: { ...validScores, originality: -1 },
      }),
    ).toThrow()
  })

  it('rejects a score above 5', () => {
    expect(() =>
      CreateTeamScoresRequest.parse({
        reasoning: 'Good work overall',
        scores: { ...validScores, originality: 6 },
      }),
    ).toThrow()
  })

  it('rejects missing rubric fields', () => {
    expect(() =>
      CreateTeamScoresRequest.parse({
        reasoning: 'Good work overall',
        scores: { originality: 3 },
      }),
    ).toThrow()
  })
})

describe('SubmitVoteRequest', () => {
  it('accepts scores that sum to exactly 10', () => {
    expect(() =>
      SubmitVoteRequest.parse({
        scores: [5, 5],
        reasoning: 'Great work',
      }),
    ).not.toThrow()

    expect(() =>
      SubmitVoteRequest.parse({
        scores: [2, 3, 5],
        reasoning: 'Great work',
      }),
    ).not.toThrow()
  })

  it('rejects scores that do not sum to 10', () => {
    expect(() =>
      SubmitVoteRequest.parse({
        scores: [5, 4],
        reasoning: 'Great work',
      }),
    ).toThrow()
  })

  it('rejects empty scores', () => {
    expect(() =>
      SubmitVoteRequest.parse({
        scores: [],
        reasoning: 'Great work',
      }),
    ).toThrow()
  })

  it('rejects reasoning longer than 2000 characters', () => {
    expect(() =>
      SubmitVoteRequest.parse({
        scores: [5, 5],
        reasoning: 'A'.repeat(2001),
      }),
    ).toThrow()
  })

  it('rejects a score below 0', () => {
    expect(() =>
      SubmitVoteRequest.parse({
        scores: [10, -1, 1],
        reasoning: 'Great work',
      }),
    ).toThrow()
  })

  it('rejects a score above 5', () => {
    expect(() =>
      SubmitVoteRequest.parse({
        scores: [6, 4],
        reasoning: 'Great work',
      }),
    ).toThrow()
  })
})

describe('CreateApplicationRequest', () => {
  it('accepts a valid application', () => {
    expect(() =>
      CreateApplicationRequest.parse({
        name: 'My App',
        proxy_microsoft: false,
      }),
    ).not.toThrow()
  })

  it('accepts a valid application with type', () => {
    expect(() =>
      CreateApplicationRequest.parse({
        name: 'My App',
        proxy_microsoft: false,
        type: 'first',
      }),
    ).not.toThrow()

    expect(() =>
      CreateApplicationRequest.parse({
        name: 'My App',
        proxy_microsoft: false,
        type: 'third',
      }),
    ).not.toThrow()
  })

  it('accepts a valid application with description', () => {
    expect(() =>
      CreateApplicationRequest.parse({
        name: 'My App',
        description: 'A useful app',
        proxy_microsoft: false,
      }),
    ).not.toThrow()
  })

  it('rejects a missing name', () => {
    expect(() =>
      CreateApplicationRequest.parse({ proxy_microsoft: false }),
    ).toThrow()
  })

  it('rejects an empty name', () => {
    expect(() =>
      CreateApplicationRequest.parse({ name: '', proxy_microsoft: false }),
    ).toThrow()
  })

  it('rejects a name longer than 64 characters', () => {
    expect(() =>
      CreateApplicationRequest.parse({
        name: 'A'.repeat(65),
        proxy_microsoft: false,
      }),
    ).toThrow()
  })

  it('rejects a description longer than 1024 characters', () => {
    expect(() =>
      CreateApplicationRequest.parse({
        name: 'My App',
        description: 'A'.repeat(1025),
        proxy_microsoft: false,
      }),
    ).toThrow()
  })

  it('rejects an invalid type', () => {
    expect(() =>
      CreateApplicationRequest.parse({
        name: 'My App',
        proxy_microsoft: false,
        type: 'second',
      }),
    ).toThrow()
  })
})

describe('ManageRedirectUriRequest', () => {
  it('accepts a valid HTTPS URL', () => {
    expect(() =>
      ManageRedirectUriRequest.parse({ uri: 'https://example.com/callback' }),
    ).not.toThrow()
  })

  it('accepts a localhost URL', () => {
    expect(() =>
      ManageRedirectUriRequest.parse({ uri: 'http://localhost:3000/callback' }),
    ).not.toThrow()
  })

  it('rejects a plain HTTP URL', () => {
    expect(() =>
      ManageRedirectUriRequest.parse({ uri: 'http://example.com/callback' }),
    ).toThrow()
  })

  it('rejects an invalid URL', () => {
    expect(() => ManageRedirectUriRequest.parse({ uri: 'not-a-url' })).toThrow()
  })

  it('rejects an empty string', () => {
    expect(() => ManageRedirectUriRequest.parse({ uri: '' })).toThrow()
  })
})

describe('OAuth2TokenRequest', () => {
  it('accepts a valid token request', () => {
    expect(() =>
      OAuth2TokenRequest.parse({
        grant_type: 'authorization_code',
        code: 'abc123',
        client_id: 'my-client',
        client_secret: 'my-secret',
      }),
    ).not.toThrow()
  })

  it('accepts optional redirect_uri and code_verifier', () => {
    expect(() =>
      OAuth2TokenRequest.parse({
        grant_type: 'authorization_code',
        code: 'abc123',
        client_id: 'my-client',
        client_secret: 'my-secret',
        redirect_uri: 'https://example.com/callback',
        code_verifier: 'verifier123',
      }),
    ).not.toThrow()
  })

  it('rejects a wrong grant_type', () => {
    expect(() =>
      OAuth2TokenRequest.parse({
        grant_type: 'client_credentials',
        code: 'abc123',
        client_id: 'my-client',
        client_secret: 'my-secret',
      }),
    ).toThrow()
  })

  it('rejects missing code', () => {
    expect(() =>
      OAuth2TokenRequest.parse({
        grant_type: 'authorization_code',
        client_id: 'my-client',
        client_secret: 'my-secret',
      }),
    ).toThrow()
  })

  it('rejects missing client_id', () => {
    expect(() =>
      OAuth2TokenRequest.parse({
        grant_type: 'authorization_code',
        code: 'abc123',
        client_secret: 'my-secret',
      }),
    ).toThrow()
  })

  it('rejects missing client_secret', () => {
    expect(() =>
      OAuth2TokenRequest.parse({
        grant_type: 'authorization_code',
        code: 'abc123',
        client_id: 'my-client',
      }),
    ).toThrow()
  })

  it('rejects empty code', () => {
    expect(() =>
      OAuth2TokenRequest.parse({
        grant_type: 'authorization_code',
        code: '',
        client_id: 'my-client',
        client_secret: 'my-secret',
      }),
    ).toThrow()
  })
})

describe('OAuth2SessionActionRequest', () => {
  it('accepts a valid cancel action', () => {
    expect(() => OAuth2SessionActionRequest.parse({ action: 'cancel' })).not.toThrow()
  })

  it('accepts a valid consent action', () => {
    expect(() => OAuth2SessionActionRequest.parse({ action: 'consent' })).not.toThrow()
  })

  it('accepts a valid assume_consent action', () => {
    expect(() => OAuth2SessionActionRequest.parse({ action: 'assume_consent' })).not.toThrow()
  })

  it('accepts a valid deny action', () => {
    expect(() => OAuth2SessionActionRequest.parse({ action: 'deny' })).not.toThrow()
  })

  it('rejects an invalid action', () => {
    expect(() => OAuth2SessionActionRequest.parse({ action: 'approve' })).toThrow()
  })

  it('rejects an empty action', () => {
    expect(() => OAuth2SessionActionRequest.parse({ action: '' })).toThrow()
  })
})

describe('SetActiveSeasonRequest', () => {
  it('accepts a valid season_id', () => {
    expect(() => SetActiveSeasonRequest.parse({ season_id: 1 })).not.toThrow()
  })

  it('accepts null season_id', () => {
    expect(() => SetActiveSeasonRequest.parse({ season_id: null })).not.toThrow()
  })

  it('rejects 0 as season_id (not positive)', () => {
    expect(() => SetActiveSeasonRequest.parse({ season_id: 0 })).toThrow()
  })

  it('rejects a negative season_id', () => {
    expect(() => SetActiveSeasonRequest.parse({ season_id: -1 })).toThrow()
  })

  it('rejects a non-integer season_id', () => {
    expect(() => SetActiveSeasonRequest.parse({ season_id: 1.5 })).toThrow()
  })
})

describe('ElectionVoteRequest', () => {
  it('accepts valid votes', () => {
    expect(() =>
      ElectionVoteRequest.parse({
        positions: [
          {
            title: 'President',
            candidates: [
              { id: 'c1', rank: 1 },
              { id: 'c2', rank: 2 },
            ],
          },
        ],
      }),
    ).not.toThrow()
  })

  it('accepts candidates with null rank', () => {
    expect(() =>
      ElectionVoteRequest.parse({
        positions: [
          {
            title: 'President',
            candidates: [
              { id: 'c1', rank: null },
              { id: 'c2', rank: 1 },
            ],
          },
        ],
      }),
    ).not.toThrow()
  })

  it('accepts empty positions array', () => {
    expect(() => ElectionVoteRequest.parse({ positions: [] })).not.toThrow()
  })

  it('rejects candidates with rank below 1', () => {
    expect(() =>
      ElectionVoteRequest.parse({
        positions: [
          {
            title: 'President',
            candidates: [{ id: 'c1', rank: 0 }],
          },
        ],
      }),
    ).toThrow()
  })

  it('rejects non-integer rank', () => {
    expect(() =>
      ElectionVoteRequest.parse({
        positions: [
          {
            title: 'President',
            candidates: [{ id: 'c1', rank: 1.5 }],
          },
        ],
      }),
    ).toThrow()
  })
})