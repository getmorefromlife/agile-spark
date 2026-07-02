export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("Application error captured:", error, context);
}
