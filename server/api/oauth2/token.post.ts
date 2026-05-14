/* 
 * Used for exchanging a code for a JWT token.
 *
 * Long lasting token
 */
export default defineEventHandler(async (event) => {


    const body = await readBody(event)

    console.log(body)

  
})