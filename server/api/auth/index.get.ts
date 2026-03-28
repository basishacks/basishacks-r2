

export default defineEventHandler(async (event) => {
  const { sendCodeURL } = useRuntimeConfig(event)
  if (!sendCodeURL) {
    throw createError({
      status: 500,
      message: 'Login is not configured on the server',
    })
  }

  const { email } = await readValidatedBody(event, SendCodeRequest.parse)

  const user = await addCodeToUser(event, email)

  const res = await fetch(sendCodeURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code: user.login_code! }),
  })
  const data = await res.json<
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

  return { message: 'Sent code to your Teams account' }
})
