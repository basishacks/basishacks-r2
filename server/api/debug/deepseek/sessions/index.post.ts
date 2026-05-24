import { createSession } from '~~/server/utils/deepseek-store';
import { requirePermission } from '~~/server/utils/auth';
import { DevPermissions } from '~~/shared/permissions';

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.DEEPSEEK);

  const body = await readBody(event);
  const { sessionName } = body;

  if (!sessionName || typeof sessionName !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'sessionName is required and must be a string',
    });
  }

  try {
    const session = createSession(sessionName);
    return session;
  } catch (error: any) {
    console.error('Error creating deepseek session:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create session: ' + error.message,
    });
  }
});
