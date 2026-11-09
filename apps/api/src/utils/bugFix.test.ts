import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isBugFixMessage, getBugFixKeyword, BUG_FIX_PATTERN, LEGACY_BUG_FIX_PATTERN } from './bugFix'

test('default bug-fix pattern matches requested subjects and rejects unrelated substrings', () => {
  const matching = [
    'Fix typo in README',
    'Fixed crash on startup',
    'Fixes #123',
    'Closes #45',
    'Resolved merge conflict',
    'Bugfix: null pointer',
    'hotfix login',
    'Add feature, refs issue 12',
    "Revert 'Fix login'",
  ]
  const notMatching = ['Update dependencies', 'Prefix handling', 'Add suffix option']

  for (const subject of matching) assert.equal(isBugFixMessage(subject), true, subject)
  for (const subject of notMatching) assert.equal(isBugFixMessage(subject), false, subject)
})

test('exports the previous pattern and returns the matched default keyword', () => {
  assert.equal(LEGACY_BUG_FIX_PATTERN.test('fix'), true)
  assert.equal(BUG_FIX_PATTERN.test('Fixes'), true)
  assert.equal(getBugFixKeyword('Fixed crash on startup'), 'fixed')
})
