import { FetchError } from 'ofetch'

export function getErrorMessage(e: unknown) {
  try {
    if (e instanceof FetchError) {
      console.log(e.message, e.data, e.stack, e.statusMessage)
      try {
        if (e.data) {
          if ('message' in e.data && e.data.message) {
            return String(e.data.message)
          }
        }
      } catch {
        return e.message
      }
      return e.message
    }
    return String(e)
  } catch (inner) {
    console.error('Error trying to get error message:', inner)
    return String(e)
  }
}
