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

let sessionIdCounter = 1
const sessions = new Map<number, ChatSession>()

export function createSession(sessionName: string): ChatSession {
  const id = sessionIdCounter++
  const session: ChatSession = {
    id,
    sessionName,
    createdAt: Math.floor(Date.now() / 1000),
    messages: [],
  }
  sessions.set(id, session)
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
