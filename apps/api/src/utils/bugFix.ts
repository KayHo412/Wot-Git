const BUG_FIX_PATTERN = /\b(?:fix|bug|defect|error|issue|patch|repair|resolve|close|crash)\b/i

export function isBugFixMessage(message: string): boolean {
  return BUG_FIX_PATTERN.test(message)
}
