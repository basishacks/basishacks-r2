import { CreateApplicationRequest } from '~~/shared/schemas';
import { DevPermissions, hasPermission } from '~~/shared/permissions';
import {
  getOAuth2ApplicationCountByOwner,
  MAX_APPLICATIONS_PER_USER,
} from '~~/server/utils/database/oauth2_applications';

export default defineEventHandler(
  applyRateLimit(async (event) => {
    const user = await requirePermission(event, DevPermissions.PORTAL_APPLICATIONS_CREATE);

    const body = await readValidatedBody(event, CreateApplicationRequest.parse);

    const count = await getOAuth2ApplicationCountByOwner(event, user.id);
    if (count >= MAX_APPLICATIONS_PER_USER) {
      throw createError({
        status: 429,
        message: `You can only create up to ${MAX_APPLICATIONS_PER_USER} applications`,
      });
    }

    const canCreateFirstParty = hasPermission(
      user.role,
      DevPermissions.PORTAL_APPLICATIONS_CREATE_FIRST_PARTY,
    );
    const appType = canCreateFirstParty && body.type === 'first' ? 'first' : 'third';

    const app = await createOAuth2Application(
      event,
      user.id,
      body.name,
      body.description || null,
      body.proxy_microsoft,
      appType,
    );

    return app;
  }),
);
