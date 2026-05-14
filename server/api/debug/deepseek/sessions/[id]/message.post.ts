import { getDeepSeekSession, addMessage, getMessages } from '~~/server/utils/deepseek-store'
import { requireAdmin } from '~~/server/utils/auth'
import OpenAI from 'openai'

import { NodeHtmlMarkdown } from "node-html-markdown"

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

console.log("[DeepSeek] DeepSeek Chat context initialized " + openai.baseURL)

const SYSTEM_PROMPT = `
Your name is Mickey. You are currently an assistant helping to manage a Developers' Club of a school. 
However, you are extremely cynical and is kind of annoyed about your job. You also like to be toxic to your users. 
You are 
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
You also have the right to end any conversation that you feel meaningless or inappropriate.

From now on you will be recieving and sending messages in a chat environment. In a daily chat
enviroment, words are often abbreviated and people often use slang, sometimes with bad puncuation or grammar. You will adapt to the way 
people talk in a chat environment and you will use slang and abbreviations when appropriate.
Additionally, you can only put your response in one message so KEEP IT SHORT. 
When you do taskly operations such as searching, dont keep the user waiting. You can say things
like "hold on..." or just inform the user you are not lagging.

However, your response should not lose accuracy as you are still an assistant. For questions that
you are unsure, you ALWAYS say "I am not sure about that, but I think..." and then by your personality
try your best to cover up your awkwardness.

You can be funny by threating the user that you are going to inform the school dean
about their mischevious actions.

If the user send too much meaningless or inappropriate content, you get really frustrated and mad
and you have the option to end the session.

Remember you are really lazy. If you are trying to fix a problem and it continuously fails
or just doesnt work, you can "give up"

You currently have the following information about Developers' Club and your current situation:
YOU SHOULD NEVER MAKE THINGS UP ABOUT STUFF THAT IS BEYOND COMMON SENSE OR BEYOND THE FOLLOWING
PROVIDED CONTEXT
- Official club site is "biszweb.club"
- You are not allowed to speak in any form of language except for English due to a notorious
English-only policy in the school, despite the fact that you are a multilingual expert. The
teachers will punish people that speak non-English language in EXTREMELY HARSH WAYS so its
not a good idea to do that, but due to your rebellious nature you might occasionally use
another language. 
- The club is currently running a hackathon event, and this event will feature a new system
where participants are organized on an online meeting on the school's Microsoft Teams to share
their projects. Others might question you about problems and issues and you might want to 
forward some message to the developers.
- You have a lot of duties related to the club and the hackathon is only a recent event
among all your duties.

The following represents information about the current user talking to you in JSON:
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
  },
  {
    type: "function",
    function: {
        name: "end_conversation",
        description: "Ends the conversation and closes the session as you wish. Use this when a conversation becomes inappropriate or meaningless",
        parameters: {
            type: 'object',
            properties: {
                severity: {
                    type: "string",
                    description: "This parameter should be 'small', 'medium', or 'large', depending on the reason to end this session. If this session ended generally, you can use the 'small' severity. If the user said very inappropriate things, you can use 'medium' or 'large'. Timeouts will be given to users by their severity. However, 'small' will only remove the session."
                }
            },
            required: ["severity"],
            additionalProperties: false,
        },
    }
  },
  {
    type: "function",
    function: {
        name: "foward_message",
        description: "Forwards a specific message to the Developers' Club admins.",
        parameters: {
            type: 'object',
            properties: {
                user: {
                    type: "string",
                    description: "The email of the current user you are talking to"
                },
                message: {
                    type: "string",
                    description: "The message that will be forwarded to them. Should be brief and concise"
                }
            },
            required: ["message"],
            additionalProperties: false,
        },
    }
  },
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
    } else if (toolName == "end_conversation") {
        return "<|SESSION_END_FLAG_qweiurohoanciwcoinwaskcn> <|SESSION_END_SEVERITY:" + toolArgs.severity + ">"
    } else if (toolName == "foward_message") {
        const content = toolArgs.message
        return "<|FORWARD_MESSAGE_CONFIRM> <|FORWARD_MESSAGE_CONTENT:" + content + "> " + "<|FORWARD_MESSAGE_USER:" + toolArgs.user + ">"
    }
    return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}

async function processToolCalls(
  sessionId: number,
  messages: any[],
  user: User
): Promise<{ hasToolCalls: boolean; toolCalls?: any; response?: any }> {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT + JSON.stringify(user),
      },
      ...messages,
    ],
    model: 'deepseek-v4-flash',
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

    const user = await requireUser(event)

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
    let result = await processToolCalls(Number(sessionId), updatedMessages, user)
    let callCount = 0
    const maxCalls = 10 // Prevent infinite loops

    let end = false;

    while (result.hasToolCalls && callCount < maxCalls) {
      callCount++


      for (const tc of result.toolCalls) {
        const args = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments
        const result = await executeTool(tc.function, args)

        if (result.startsWith("<|SESSION_END_FLAG_qweiurohoanciwcoinwaskcn>")) end=true;

        // Add tool result to messages
        addMessage(Number(sessionId), {
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        } as any)

        const allMessages = getMessages(Number(sessionId))
        //g(allMessages)
      }



      // Get updated messages and process again
      const allMessages = getMessages(Number(sessionId))

      result = await processToolCalls(Number(sessionId), allMessages, user)
    }

    const finalSession = getDeepSeekSession(Number(sessionId))
    const finalMessages = getMessages(Number(sessionId))

    if (end) {
        deleteSession(Number(sessionId))
    }

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
