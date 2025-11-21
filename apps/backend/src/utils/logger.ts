export const customLogger = (message: string, ...rest: unknown[]) => {
  const currentTime = new Date().toLocaleString()
  console.log(`[${currentTime}] ${message}`, ...rest)
}
