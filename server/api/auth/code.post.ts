import { SendCodeRequest } from '~~/shared/schemas'
import { getAuthorizeSession } from '../oauth2/session.post'

export default defineEventHandler(async (event) => {
  const { sendCodeURL } = useRuntimeConfig(event)
  if (!sendCodeURL) {
    throw createError({
      status: 500,
      message: 'Login is not configured on the server',
    })
  }

  const { email, token } = await readValidatedBody(event, SendCodeRequest.parse)
  const session = getAuthorizeSession(token)
  console.log("[Authorize -> Code] Requested Login Code: T:" + token.substring(0, 16) + "...")

  if (!session) {
    throw createError({
      status: 400,
      message: "session_expired"
    })
  }

  // Keeping legacy code flow
  const user = await addCodeToUser(event, email)
  session.user = user
  session.teams_code = user.login_code
  console.log("[Authorize -> Code] Code added for " + user.id + " " + user.login_code)

  const res = await fetch(sendCodeURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code: user.login_code! }),
  })
  const data = await res.json<
  //@ts-ignore Lol.
    { success: true; name: string } | { success: false; error: string }
  >()
  if (!data.success) {
    throw createError({
      status: res.status,
      message: data.error,
    })
  }
  user.name = data.name
  await updateUserName(event, user)
  session.login_state = "requesting"

  return { message: 'Sent code to your Teams account' }
})
