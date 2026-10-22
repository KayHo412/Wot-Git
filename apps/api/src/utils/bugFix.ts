const BUG_FIX_PATTERN = /\b(?:fix|bug|defect|error|issue|patch|repair|resolve|close|crash)\b/i

export function isBugFixMessage(message: string): boolean {
  return getBugFixKeyword(message) !== null
}

export function getBugFixKeyword(message: string): string | null {
  return message.match(BUG_FIX_PATTERN)?.[0].toLowerCase() ?? null
}
