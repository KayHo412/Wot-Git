import { ANALYSIS_MAX_COMMITS } from '../config/limits'
import { calculateCoChange, readGitHistory } from './gitHistory'

export async function runCoChange(repoPath: string, signal?: AbortSignal) {
  const history = await readGitHistory(repoPath, ANALYSIS_MAX_COMMITS, signal)
  return (await calculateCoChange(history.commits, signal)).items
}
