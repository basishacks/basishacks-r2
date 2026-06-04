/**
 * In-memory store for DeepSeek chat sessions
 * Supports full tool calling loops with proper message management
 */

import type { ChatCompletionMessage } from 'openai/resources/index.mjs'

interface ChatSession {
  id: number
  sessionName: string
  createdAt: number
  messages: ChatCompletionMessage[]
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_SESSIONS = 100

let sessionIdCounter = 1
const sessions = new Map<number, ChatSession>()

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.createdAt * 1000 > SESSION_TTL_MS) {
      sessions.delete(id)
    }
  }
}

function enforceMaxSessions() {
  if (sessions.size <= MAX_SESSIONS) return
  const sorted = Array.from(sessions.values()).sort((a, b) => a.createdAt - b.createdAt)
  const toRemove = sorted.slice(0, sessions.size - MAX_SESSIONS)
  for (const session of toRemove) {
    sessions.delete(session.id)
  }
}

export function createSession(sessionName: string): ChatSession {
  cleanupExpiredSessions()

  const id = sessionIdCounter++
  const session: ChatSession = {
    id,
    sessionName,
    createdAt: Math.floor(Date.now() / 1000),
    messages: [],
  }
  sessions.set(id, session)

  enforceMaxSessions()
  return session
}

export function getDeepSeekSession(sessionId: number): ChatSession | undefined {
  return sessions.get(sessionId)
}

export function getAllSessions(): ChatSession[] {
  return Array.from(sessions.values())
}

export function deleteSession(sessionId: number): boolean {
  return sessions.delete(sessionId)
}

export function addMessage(sessionId: number, message: ChatCompletionMessage): ChatSession | undefined {
  const session = sessions.get(sessionId)
  if (!session) return undefined
  session.messages.push(message)
  return session
}

export function getMessages(sessionId: number): ChatCompletionMessage[] {
  const session = sessions.get(sessionId)
  return session?.messages || []
}
