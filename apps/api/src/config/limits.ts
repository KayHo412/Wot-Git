/** Shared operational limits for repository scans. */
export const CLONE_TIMEOUT_MS = 60_000
export const ANALYSIS_MAX_COMMITS = 10_000
export const HEALTH_MAX_HISTORY_COMMITS = ANALYSIS_MAX_COMMITS
export const HEALTH_MAX_TIMELINE_MONTHS = 120
export const ANALYSIS_MAX_FILES = 10_000
export const HEALTH_MAX_FILES = ANALYSIS_MAX_FILES
export const COCHANGE_MAX_FILES_PER_COMMIT = 100
export const SCAN_TIMEOUT_MS = 3 * 60_000
export const REPOSITORY_MAX_BYTES = 1024 * 1024 * 1024
