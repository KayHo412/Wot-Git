export const LEGACY_BUG_FIX_PATTERN = /\b(?:fix|bug|defect|error|issue|patch|repair|resolve|close|crash)\b/i
export const BUG_FIX_PATTERN = /\b(?:(?:bug|hot)fix(?:e[sd]|es|ing)?|fix(?:e[sd]|ing)?|bugs?|defects?|errors?|issues?|patch(?:e[sd]|ing)?|repair(?:s|ed|ing)?|resolv(?:e[sd]?|ing)|clos(?:e[sd]?|ing)|crash(?:e[sd]|ing)?)\b/i

export function isBugFixMessage(message: string): boolean {
  return getBugFixKeyword(message) !== null
}

export function getBugFixKeyword(message: string): string | null {
  return message.match(BUG_FIX_PATTERN)?.[0].toLowerCase() ?? null
}
