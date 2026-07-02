---
title: Debug & AI
description: Debug file utilities, DeepSeek AI chat sessions, and the Microsoft Teams chatbot integration.
---

# Debug & AI

The platform includes a set of development and AI utilities gated by developer permissions. These are intended for administrative and testing use, not for general participants.

---

## Debug File Utilities

Debug file endpoints let authorized users upload and list static assets without going through the normal project-submission flow.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/debug/upload` | `PORTAL_DEBUG_VIEW` or admin | Upload a file to `public/assets/` or `public/userassets/` |
| GET | `/api/debug/files` | `PORTAL_DEBUG_VIEW` or admin | List uploaded assets |

### Upload Request

`POST /api/debug/upload` accepts `multipart/form-data`:

| Field | Description |
|-------|-------------|
| `file` | The file to upload |
| `mode` (query) | `static` → `public/assets/`, `user` → `public/userassets/` |
| `keepName` (query) | `true` to keep the original filename, otherwise a random name is generated |

Response:

```json
{
  "permalink": "/assets/<filename>"
}
```

The helpers in `server/utils/assets.ts` validate filenames to prevent path traversal and create parent directories as needed.

---

## DeepSeek AI Chat Sessions

The DeepSeek integration provides an in-memory chat interface in the developer portal. It uses the OpenAI SDK pointing at the DeepSeek API (`https://api.deepseek.com`).

### Lazy Initialization

The OpenAI client is initialized lazily on first use. If `DEEPSEEK_API_KEY` is missing, the endpoint returns:

```json
{
  "statusCode": 503,
  "statusMessage": "DEEPSEEK_API_KEY is not configured"
}
```

This prevents the server from crashing at startup when the key is not provided.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/debug/deepseek/sessions` | `DevPermissions.DEEPSEEK` | Create a new chat session |
| GET | `/api/debug/deepseek/sessions/:id` | `DevPermissions.DEEPSEEK` | Get session and messages |
| DELETE | `/api/debug/deepseek/sessions/:id` | `DevPermissions.DEEPSEEK` | Delete a session |
| POST | `/api/debug/deepseek/sessions/:id/message` | `DevPermissions.DEEPSEEK` | Send a message and run tools |

### Session Store

Sessions are stored in memory via `server/utils/deepseek-store.ts`:

```ts
interface ChatSession {
  id: number
  sessionName: string
  createdAt: number
  messages: ChatCompletionMessage[]
}
```

::: warning
All chat data is lost when the server restarts.
:::

### Character Prompt

DeepSeek is instructed to role-play as **Barron Wang** with a casual, terse style. Key traits:

- Short phrases, often 1–3 sentences
- Frequent use of `lol`, `bruh`, `oof`, `sure`, `nice`
- Typing-delay simulation via `<br delay=X>` tags
- English-only responses
- Avoids corporate or overly polite language

The system prompt also injects context about the Developers' Club (`biszweb.club`) and the current user as JSON.

### Available Tools

The chatbot can invoke functions in a loop (max 10 iterations):

| Tool | Purpose |
|------|---------|
| `get_time` | Returns the current GMT+8 time |
| `crawl_web` | Fetches raw HTML from a URL |
| `view_web` | Fetches a markdown conversion of a URL |
| `end_conversation` | Ends the session with a severity flag |
| `foward_message` | Forwards a message to club admins |

Tool results are appended to the session as `role: 'tool'` messages and the conversation continues until no more tool calls are requested.

### UI

The developer portal page `/developers/deepseek` provides the chat UI. It is gated by `PORTAL_DEEPSEEK_VIEW` or admin.

---

## Microsoft Teams Chatbot

The chatbot endpoints integrate with Microsoft Graph to send and receive Teams chat messages.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chatbot/message` | OAuth2 JWT with `chat.readwrite` scope | Sends a test rich-text message to a hard-coded admin user |
| GET | `/api/chatbot/index` | None | Empty placeholder / health-check endpoint |

### `/api/chatbot/message`

This endpoint demonstrates the Microsoft Graph proxy:

1. Authenticates with an OAuth2 Bearer token using `withOAuth2JWT`.
2. Requires the `chat.readwrite` scope.
3. Creates or reuses a 1:1 direct chat with a target user via `createOrGetExistingDirectChat`.
4. Sends a rich HTML message with `sendRichChatMessage`.

The underlying Graph API calls live in `server/plugins/microsoft.ts` and are centralized for auditability.

### Webhooks

Microsoft Graph change notifications are received at:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/_webhooks/update` | Chat message change notifications |
| POST | `/api/_webhooks/lifecycle` | Subscription lifecycle notifications |

See [Plugins & Middleware](./plugins-middleware) for details on webhook validation and subscription management.

---

## Permissions

| Permission | Allows |
|------------|--------|
| `dev_debug` | Direct access to debug API routes |
| `portal.debug.view` | View the Debug Files page in the developer portal |
| `dev_deepseek` | Direct access to DeepSeek API routes |
| `portal.deepseek.view` | View the DeepSeek chat page in the developer portal |

Admins implicitly have all of the above.

---

## Source Files

- `server/utils/deepseek-store.ts` — in-memory session store
- `server/api/debug/deepseek/sessions/index.post.ts`
- `server/api/debug/deepseek/sessions/[id]/index.get.ts`
- `server/api/debug/deepseek/sessions/[id]/index.delete.ts`
- `server/api/debug/deepseek/sessions/[id]/message.post.ts`
- `server/api/debug/upload.post.ts`
- `server/api/debug/files.get.ts`
- `server/api/chatbot/message.get.ts`
- `server/api/chatbot/index.get.ts`
- `app/pages/developers/deepseek.vue`
- `app/pages/developers/debug.vue`
