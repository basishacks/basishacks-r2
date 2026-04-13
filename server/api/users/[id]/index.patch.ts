import { profile } from 'node:console';
import { randomUUID } from 'node:crypto';
import { removeAsset } from '~~/server/utils/assets';
import { updateUserProfileTheme } from '~~/server/utils/database/users';
import { applyRateLimit } from '~~/server/utils/rateLimit'
import { UpdateUserRequest } from '~~/shared/schemas'


const base64ToFile = function(base64String: string): any {
  // 1. Split the header from the data

  

  const arr: Array<string> = base64String.split(',');
  const mime = arr[0]?.split(";")[0]?.split(":")[1];

  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'text/plain': 'txt'
  };
  
  const extension = mimeToExt[mime] || 'bin';
  
  // 2. Decode the Base64 string to a binary string
  const bstr = atob(arr[1]);
  let n = bstr.length;
  
  // 3. Convert binary string to a typed array (Uint8Array)
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  const file = new File([u8arr], '', { type: mime });

  // 4. Create and return the File object
  return {
    file,
    extension,
    mimeType: mime
  };
};

export default defineEventHandler(applyRateLimit(async (event) => {
  const id = parseInt(getRouterParam(event, 'id')!)

  const {
    user: { id: userID },
  } = await requireUserSession(event)

  if (id !== userID) {
    throw createError({
      status: 403,
      message: 'Cannot update other users',
    })
  }

  const { name, profile_theme_image } = await readValidatedBody(event, UpdateUserRequest.parse)

  const user = await getUser(event, id)
  if (!user) {
    await clearUserSession(event)
    throw createError({
      status: 401,
      message: 'Logged in user not found',
    })
  }

  if (name !== undefined) {
    user.name = name
    await updateUserName(event, user)
  }
  if (profile_theme_image != undefined) {
    const {file, extension, mime} = base64ToFile(profile_theme_image.toString());
    
    const buf = await file.arrayBuffer();
    await removeAsset(user.profile_theme?.split("|")[1]);
    const uuid = randomUUID()
    const path = await createAsset(uuid + "." + extension, Buffer.from(buf));


    user.profile_theme = "url|" + path 
    
    await updateUserProfileTheme(event, user)
  }

  

  return { message: 'Your profile is updated' }
}, {maxRequests: 10, windowMs: 60 * 1000}))
