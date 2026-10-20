import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { abortError, createScanContext } from './scan'

describe('scan context', () => {
  it('propagates request cancellation as a scan abort', () => {
    const parent = new AbortController()
    const scan = createScanContext(parent.signal)
    parent.abort(new Error('client disconnected'))
    assert.equal(scan.signal.aborted, true)
    assert.equal((abortError(scan.signal) as NodeJS.ErrnoException | null)?.code, 'SCAN_ABORTED')
    scan.dispose()
  })

  it('preserves the deadline error code', () => {
    const controller = new AbortController()
    const timeout = new Error('deadline') as NodeJS.ErrnoException
    timeout.code = 'SCAN_TIMEOUT'
    controller.abort(timeout)
    assert.equal((abortError(controller.signal) as NodeJS.ErrnoException | null)?.code, 'SCAN_TIMEOUT')
  })
})
