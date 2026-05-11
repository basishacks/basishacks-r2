export async function withLoadingIndicator<T>(func: () => T): Promise<T> {
  const loadingIndicator = useLoadingIndicator()
  loadingIndicator.start()
  try {
    const res = await func()
    loadingIndicator.finish()
    return res
  } catch (e) {
    loadingIndicator.finish({ error: true })
    throw e
  }
}
