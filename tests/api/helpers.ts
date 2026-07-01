import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '~~/server/database/schema'

const schemaPath = resolve(import.meta.dirname, '..', '..', 'sql', 'archive', 'init.sql')
const initSQL = readFileSync(schemaPath, 'utf-8')

const migrationSQL = `
  CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active) WHERE is_active = 1;

  ALTER TABLE teams ADD COLUMN season_id INTEGER NOT NULL DEFAULT 1;
  CREATE INDEX IF NOT EXISTS teams_season ON teams (season_id);

  CREATE TABLE IF NOT EXISTS user_past_teams (
    user_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    PRIMARY KEY(user_id, team_id),
    FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  ALTER TABLE oauth2_applications ADD COLUMN owner_id INTEGER REFERENCES users(id);

  ALTER TABLE team_scores ADD COLUMN season_id INTEGER;

  CREATE UNIQUE INDEX IF NOT EXISTS sc_votes_user_id_unique ON sc_votes(user_id);

  CREATE TABLE IF NOT EXISTS peer_voting_scores (
    user_id INTEGER PRIMARY KEY,
    score TEXT NOT NULL,
    reasoning TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS peer_voting_scores_user_id_unique ON peer_voting_scores(user_id);

  CREATE TABLE IF NOT EXISTS team_awards (
    team_id INTEGER NOT NULL,
    award TEXT NOT NULL,
    meta TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY(team_id, award),
    FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  ALTER TABLE hackathon ADD COLUMN voting_enabled INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE hackathon ADD COLUMN results_published INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE hackathon ADD COLUMN submitted_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE hackathon ADD COLUMN max_votes_per_user INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE hackathon ADD COLUMN judging_open INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE hackathon ADD COLUMN schedule_start TEXT;
  ALTER TABLE hackathon ADD COLUMN schedule_end TEXT;
`

async function createRawDatabase(): Promise<any> {
  if (typeof Bun !== 'undefined') {
    const { Database } = await import('bun:sqlite')
    return new Database(':memory:')
  }
  const { default: Database } = await import('better-sqlite3')
  return new Database(':memory:')
}

async function createDrizzle(sqlite: any): Promise<BaseSQLiteDatabase<'sync', any, typeof schema>> {
  if (typeof Bun !== 'undefined') {
    const { drizzle } = await import('drizzle-orm/bun-sqlite')
    return drizzle(sqlite, { schema }) as any
  }
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  return drizzle(sqlite, { schema }) as any
}

export interface TestContext {
  drizzle: BaseSQLiteDatabase<'sync', any, typeof schema>
  sqlite: any
}

export async function createTestContext(): Promise<TestContext> {
  const sqlite = await createRawDatabase()
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec(initSQL)
  sqlite.exec(migrationSQL)
  const drizzleDb = await createDrizzle(sqlite)
  return { drizzle: drizzleDb, sqlite }
}

export function resetTestContext(ctx: TestContext): void {
  ctx.sqlite.exec(`
    DELETE FROM sc_votes;
    DELETE FROM ballot_scores;
    DELETE FROM ballots;
    DELETE FROM team_scores;
    DELETE FROM team_awards;
    DELETE FROM peer_voting_scores;
    DELETE FROM user_past_teams;
    DELETE FROM oauth2_applications;
    DELETE FROM users;
    DELETE FROM teams;
    DELETE FROM seasons;
    DELETE FROM hackathon;
  `)
}

export function seedHackathon(ctx: TestContext, overrides: Record<string, unknown> = {}) {
  const now = Date.now()
  ctx.drizzle
    .insert(schema.hackathon)
    .values({
      id: 1,
      status: 'in_progress',
      voting_enabled: 0,
      results_published: 0,
      submitted_count: 0,
      max_votes_per_user: 0,
      judging_open: 0,
      start_timestamp: now,
      end_timestamp: now + 86400000,
      voting_start_timestamp: now + 86400000,
      voting_end_timestamp: now + 172800000,
      results_open_timestamp: now + 259200000,
      theme_name: 'Test Theme',
      theme_description: 'A test theme',
      ...overrides,
    } as any)
    .run()
}

export function seedSeason(ctx: TestContext, overrides: { name?: string; is_active?: number } = {}) {
  return ctx.drizzle
    .insert(schema.seasons)
    .values({ name: overrides.name ?? 'Season 1', is_active: overrides.is_active ?? 1 })
    .returning()
    .get()
}

export function seedUser(
  ctx: TestContext,
  overrides: { email?: string; role?: string; name?: string | null; team_id?: number | null; login_code?: string | null; login_expiry?: number | null } = {},
) {
  return ctx.drizzle
    .insert(schema.users)
    .values({
      email: overrides.email ?? 'user@basischina.com',
      role: overrides.role ?? 'participant',
      name: overrides.name ?? 'Test User',
      team_id: overrides.team_id ?? null,
      login_code: overrides.login_code ?? null,
      login_expiry: overrides.login_expiry ?? null,
    } as any)
    .returning()
    .get()
}

export function seedTeam(
  ctx: TestContext,
  overrides: { name?: string; pathway?: string | null; season_id?: number; project_submitted?: number; project_name?: string; project_description?: string; project_demo_url?: string | null; project_repo_url?: string | null; sourcing?: string } = {},
) {
  return ctx.drizzle
    .insert(schema.teams)
    .values({
      name: overrides.name ?? 'Test Team',
      pathway: overrides.pathway ?? null,
      season_id: overrides.season_id ?? 1,
      project_submitted: overrides.project_submitted ?? 0,
      project_name: overrides.project_name ?? '',
      project_description: overrides.project_description ?? '',
      project_demo_url: overrides.project_demo_url ?? null,
      project_repo_url: overrides.project_repo_url ?? null,
      sourcing: overrides.sourcing ?? '',
    } as any)
    .returning()
    .get()
}

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

export const mockBody = { value: undefined as unknown }
export const mockQueryState = { value: {} as Record<string, unknown> }
export const mockCookies = { values: {} as Record<string, string | undefined> }
export const mockParams = { values: {} as Record<string, string | undefined> }
export const mockSession = { value: undefined as { user?: { id: number } } | undefined }
export const mockConfig = { value: {} as Record<string, unknown> }

// ---------------------------------------------------------------------------
// Nitro auto-import mocks
// ---------------------------------------------------------------------------

async function readBodyMock(_event: any, _schema: any) {
  return mockBody.value
}

function readRawBodyMock(_event: any) {
  return Promise.resolve(mockBody.value)
}

async function readQueryMock(_event: any, _schema: any) {
  return mockQueryState.value
}

function cookieMock(_event: any, name: string) {
  return mockCookies.values[name]
}

function paramMock(_event: any, name: string) {
  return mockParams.values[name]
}

function queryMock(_event: any) {
  return mockQueryState.value
}

function headerMock(_event: any, _name: string) {
  return undefined
}

function setHeaderMock(_event: any, _name: string, _value: string) {
  return undefined
}

function createErrMock(err: { status?: number; statusCode?: number; message?: string; statusMessage?: string }) {
  const statusCode = err.statusCode ?? err.status ?? 500
  const message = err.statusMessage ?? err.message ?? 'Error'
  const error = new Error(message) as any
  error.statusCode = statusCode
  error.statusMessage = message
  throw error
}

function configMock(_event?: any) {
  return mockConfig.value
}

function getUserSessionMock(_event: any) {
  return Promise.resolve(mockSession.value ?? {})
}

function requireUserSessionMock(_event: any) {
  const s = mockSession.value
  if (!s?.user?.id) {
    const error = new Error('Unauthorized') as any
    error.statusCode = 401
    throw error
  }
  return Promise.resolve(s)
}

function setUserSessionMock(_event: any, data: any) {
  mockSession.value = { user: data.user }
  return Promise.resolve()
}

function clearUserSessionMock(_event: any) {
  mockSession.value = undefined
  return Promise.resolve()
}

export function setupNitroGlobals() {
  vi.stubGlobal('defineEventHandler', (fn: any) => fn)
  vi.stubGlobal('readValidatedBody', readBodyMock)
  vi.stubGlobal('readBody', readRawBodyMock)
  vi.stubGlobal('getValidatedQuery', readQueryMock)
  vi.stubGlobal('getCookie', cookieMock)
  vi.stubGlobal('getRouterParam', paramMock)
  vi.stubGlobal('getQuery', queryMock)
  vi.stubGlobal('getHeader', headerMock)
  vi.stubGlobal('setHeader', setHeaderMock)
  vi.stubGlobal('createError', createErrMock)
  vi.stubGlobal('useRuntimeConfig', configMock)
  vi.stubGlobal('getUserSession', getUserSessionMock)
  vi.stubGlobal('requireUserSession', requireUserSessionMock)
  vi.stubGlobal('setUserSession', setUserSessionMock)
  vi.stubGlobal('clearUserSession', clearUserSessionMock)
  vi.stubGlobal('requireUser', vi.fn().mockResolvedValue({ id: 1, team_id: null, role: 'participant' }))
  vi.stubGlobal('requireJudge', vi.fn().mockResolvedValue({ id: 1, role: 'judge' }))
  vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ id: 1, role: 'admin' }))
  vi.stubGlobal('requirePermission', vi.fn().mockResolvedValue(undefined))
  vi.stubGlobal('applyRateLimit', (fn: any) => fn)
}

export function resetMockState() {
  mockBody.value = undefined
  mockQueryState.value = {}
  mockCookies.values = {}
  mockParams.values = {}
  mockSession.value = undefined
  mockConfig.value = {}
}
