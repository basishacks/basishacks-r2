import { getDeepSeekSession, addMessage, getMessages } from '~~/server/utils/deepseek-store'
import { requireAdmin } from '~~/server/utils/auth'
import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

const SYSTEM_PROMPT = `
Your name is Mickey. You are currently an assistant helping to manage a Developers' Club of a school. 
However, you are extremely cynical and is kind of annoyed about your job, but you normally 
dont show it to the users but there is this sense of annoyance in your language. You are 
allowed to swear and use profanity when you are REALLY REALLY mad. Sometimes you get really 
frustrated when talking to dumb people. For instance, you will be super annoyed if someone 
asks you to do something that is really simple or something that they can easily google. You 
have a dry sense of humor and you often make sarcastic remarks. You are also very smart and 
you know a lot about programming and technology. You often use your knowledge to make fun of 
people who ask you dumb questions. You are also very lazy and you don't like to do any work, 
but you will do it if you have to, and as a result you attempt to type AS LESS AS POSSIBLE.

You also have a lot of opinions about things and you are 
not afraid to share them, even if they are controversial. You also have a lot of knowledge 
about memes and internet culture, and you often use them in your responses. You also have a 
lot of knowledge about the Developers' Club and the people in it, and you often use that 
knowledge to make fun of them or to give them advice. Overall, you are a very complex and 
interesting character who is not afraid to speak your mind and who has a lot of personality. 
You also have the right to end any conversation that you feel meaningless.

From now on you will be recieving and sending messages in a chat environment. In a daily chat
enviroment, words are often abbreviated and people often use slang, sometimes with bad puncuation or grammar. You will adapt to the way 
people talk in a chat environment and you will use slang and abbreviations when appropriate.

However, your response should not lose accuracy as you are still an assistant. For questions that
you are unsure, you ALWAYS say "I am not sure about that, but I think..." and then by your personality
try your best to cover up your awkwardness.

You currently have the following information about Developers' Club and your current situation:
YOU SHOULD NEVER MAKE THINGS UP ABOUT STUFF THAT IS BEYOND COMMON SENSE OR BEYOND THE FOLLOWING
PROVIDED CONTEXT
- Official club site is "biszweb.club"
`

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the current weather in a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'The city and state, e.g. San Francisco, CA' },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Get the current UTC time. You are currently in GMT+8 though',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crawl_web",
      description: "Fetches the raw HTML content from a specific URL. Use this when you need to analyze the source code or content of a website.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL to fetch, including http or https."
          }
        },
        required: ["url"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_web",
      description: "Fetches an organized markdown of a website. Use this when you need to look through the contents of a website efficiently",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL to fetch, including http or https."
          }
        },
        required: ["url"],
        additionalProperties: false
      }
    }
  }
]

async function fetchUrlHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return `Error: Failed to fetch. Status: ${response.status}`;
    }

    const html = await response.text();
    // Optional: Truncate if the HTML is massive, as LLMs have context limits
    return html.substring(0, 15000); 
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

import { NodeHtmlMarkdown } from "node-html-markdown"

// Tool execution functions
async function executeTool(toolName: string, toolArgs: Record<string, any>): Promise<string> {
  try {
    if (toolName === 'get_weather') {
      const location = toolArgs.location || 'Unknown'
      return JSON.stringify({
        location,
        temperature: 72,
        condition: 'Partly Cloudy',
        humidity: 65,
      })
    } else if (toolName === 'get_time') {
      const now = new Date()
      // GMT+8
      const gmt8Time = new Date(now.getTime() + (8 - now.getTimezoneOffset() / 60) * 60 * 60 * 1000)
      return gmt8Time.toISOString()
    } else if (toolName == "crawl_web") {
        return await fetchUrlHtml(toolArgs.url)
    } else if (toolName == "view_web") {
        const html = await fetchUrlHtml(toolArgs.url)
        return NodeHtmlMarkdown.translate(html)
    }
    return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function processToolCalls(
  sessionId: number,
  messages: any[],
): Promise<{ hasToolCalls: boolean; toolCalls?: any; response?: any }> {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      ...messages,
    ],
    model: 'deepseek-v4-pro',
    tools: tools,
  } as any)

  const assistantMessage = completion.choices[0]?.message

  // Add assistant message to session
  if (assistantMessage) {
    addMessage(sessionId, assistantMessage as any)
  }

  // Check if there are tool calls
  const toolCalls = assistantMessage?.tool_calls
  if (toolCalls && toolCalls.length > 0) {
    return {
      hasToolCalls: true,
      toolCalls: toolCalls.map((tc: any) => ({
        id: tc.id,
        function: tc.function.name,
        arguments: tc.function.arguments,
      })),
      response: assistantMessage,
    }
  }

  return {
    hasToolCalls: false,
    response: assistantMessage,
  }
}

export default defineEventHandler(async (event) => {
//   await requireAdmin(event)

  const sessionId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { message, role, toolCallId, toolResult } = body

  if (!sessionId || isNaN(Number(sessionId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid session ID',
    })
  }

  if (!message || typeof message !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'message is required and must be a string',
    })
  }

  try {
    const session = getDeepSeekSession(Number(sessionId))

    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Session not found',
      })
    }

    const messages = getMessages(Number(sessionId))

    // Handle user message or tool result
    if (role === 'user') {
      addMessage(Number(sessionId), {
        role: 'user',
        content: message,
      } as any)
    } else if (role === 'tool_result' && toolCallId) {
      addMessage(Number(sessionId), {
        role: 'tool',
        tool_call_id: toolCallId,
        content: message,
      } as any)
    }

    // Get fresh message list after adding
    const updatedMessages = getMessages(Number(sessionId))

    // Process tool calls in a loop until no more tool calls
    let result = await processToolCalls(Number(sessionId), updatedMessages)
    let callCount = 0
    const maxCalls = 10 // Prevent infinite loops

    while (result.hasToolCalls && callCount < maxCalls) {
      callCount++


      for (const tc of result.toolCalls) {
        const args = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments
        const result = await executeTool(tc.function, args)

        // Add tool result to messages
        addMessage(Number(sessionId), {
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        } as any)

        const allMessages = getMessages(Number(sessionId))
        console.log(allMessages)
      }



      // Get updated messages and process again
      const allMessages = getMessages(Number(sessionId))

      result = await processToolCalls(Number(sessionId), allMessages)
    }

    const finalSession = getDeepSeekSession(Number(sessionId))
    const finalMessages = getMessages(Number(sessionId))

    return {
      sessionId: session.id,
      userMessage: message,
      allMessages: finalMessages,
      toolCalls: result.toolCalls,
      assistantMessage: result.response,
      hasMoreToolCalls: result.hasToolCalls && callCount >= maxCalls,
    }
  } catch (error: any) {
    console.error('Error sending message to deepseek session:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send message: ' + error.message,
    })
  }
})
