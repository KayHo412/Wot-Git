import type { FileChurn } from '@wot-git/types'
import { ANALYSIS_MAX_COMMITS } from '../config/limits'
import { readGitHistory } from './gitHistory'

export async function runChurn(repoPath: string, signal?: AbortSignal): Promise<FileChurn[]> {
  return (await readGitHistory(repoPath, ANALYSIS_MAX_COMMITS, signal)).churn
}
