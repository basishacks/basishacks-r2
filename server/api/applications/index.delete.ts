import { z } from 'zod'

const DeleteApplicationsRequest = z.object({
  ids: z.array(z.string().min(1))
})

export default defineEventHandler(applyRateLimit(async (event) => {
  const body = await readValidatedBody(event, DeleteApplicationsRequest.parse)

  
  await deleteOAuth2Applications(event, body.ids)

  return { message: `Deleted ${body.ids.length} application(s)` }
}))
