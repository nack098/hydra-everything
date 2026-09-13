export function createDebugEntry(
  level: DebugLevel,
  error: unknown,
): DebugEntry {
  if (error instanceof Error) {
    return {
      level,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    }
  }

  return {
    level,
    message: String(error),
    timestamp: Date.now(),
  }
}
