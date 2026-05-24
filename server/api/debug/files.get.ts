import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { requirePermission } from '~~/server/utils/auth';
import { DevPermissions } from '~~/shared/permissions';

const readDirectoryFiles = async (dir: string) => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
};

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_DEBUG_VIEW);

  const assetsDir = join(process.cwd(), 'public', 'assets');
  const userAstDir = join(process.cwd(), 'public', 'userast');

  return {
    assets: await readDirectoryFiles(assetsDir),
    userast: await readDirectoryFiles(userAstDir),
  };
});
