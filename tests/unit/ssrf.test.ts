import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// node:dns must be mocked before the module under test is imported, since
// validateUrl() calls dns.promises.lookup() to resolve each hop.
const lookup = vi.fn()
vi.mock('node:dns', () => ({
  default: { promises: { lookup: (...args: unknown[]) => lookup(...args) } },
}))

const { isPrivateIP, fetchSimple } = await import('@/lib/ai/parse-recipe-url')

describe('isPrivateIP', () => {
  it('blocks IPv4 loopback, private and link-local ranges', () => {
    for (const ip of [
      '127.0.0.1', '127.1.2.3',
      '10.0.0.1', '10.255.255.255',
      '172.16.0.1', '172.31.255.255',
      '192.168.0.1', '192.168.255.255',
      '169.254.169.254', // AWS/GCP/Azure metadata — the payload that matters
      '0.0.0.0',
    ]) {
      expect(isPrivateIP(ip), ip).toBe(true)
    }
  })

  it('blocks ranges the original check missed', () => {
    for (const ip of [
      '100.64.0.1', '100.127.255.255', // CGNAT
      '192.0.0.1', '192.0.2.5',        // IETF assignments / TEST-NET-1
      '198.18.0.1', '198.19.255.255',  // benchmarking
      '224.0.0.1',                     // multicast
      '240.0.0.1', '255.255.255.255',  // reserved / broadcast
    ]) {
      expect(isPrivateIP(ip), ip).toBe(true)
    }
  })

  it('blocks IPv6 loopback, unspecified, ULA and link-local', () => {
    for (const ip of [
      '::1', '0:0:0:0:0:0:0:1',
      '::', '0:0:0:0:0:0:0:0',
      'fc00::1', 'fd12:3456::1',
      'fe80::1', 'FE80::1',
      'feaf::1', 'febf::1', // fe80::/10 extends past fe80
    ]) {
      expect(isPrivateIP(ip), ip).toBe(true)
    }
  })

  it('blocks IPv4-mapped IPv6 forms of private addresses', () => {
    expect(isPrivateIP('::ffff:169.254.169.254')).toBe(true)
    expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIP('::ffff:0:10.0.0.1')).toBe(true)
  })

  it('allows ordinary public addresses', () => {
    for (const ip of [
      '8.8.8.8', '1.1.1.1', '93.184.216.34',
      '172.15.0.1', '172.32.0.1',   // just outside 172.16/12
      '192.169.0.1', '192.167.0.1', // just outside 192.168/16
      '100.63.255.255', '100.128.0.1', // just outside CGNAT
      '198.17.0.1', '198.20.0.1',   // just outside benchmarking
      '223.255.255.255',            // just below multicast
      '2606:4700::1111',            // public IPv6
    ]) {
      expect(isPrivateIP(ip), ip).toBe(false)
    }
  })
})

// --------------------------------------------------------------------------

const PUBLIC = [{ address: '93.184.216.34', family: 4 }]
const METADATA = [{ address: '169.254.169.254', family: 4 }]

function htmlResponse(body: string) {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } })
}

function redirectTo(location: string, status = 302) {
  // Response.redirect() marks the response as immutable/redirect type, which
  // upsets header reads under the polyfill; build it plainly instead.
  return new Response(null, { status, headers: { location } })
}

describe('fetchSimple redirect handling', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    lookup.mockReset()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refuses to follow a redirect into the cloud metadata endpoint', async () => {
    lookup.mockImplementation(async (host: string) =>
      host === 'evil.example' ? PUBLIC : METADATA
    )
    fetchMock.mockResolvedValueOnce(redirectTo('http://169.254.169.254/latest/meta-data/'))

    const result = await fetchSimple('https://evil.example/recipe')

    expect(result).toBeNull()
    // The critical assertion: we validated the hop and bailed BEFORE issuing a
    // second request, so the metadata endpoint was never contacted.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://evil.example/recipe')
  })

  it('passes redirect: manual so the platform never follows on its own', async () => {
    lookup.mockResolvedValue(PUBLIC)
    fetchMock.mockResolvedValueOnce(htmlResponse('x'.repeat(600)))

    await fetchSimple('https://example.com/recipe')

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })

  it('follows a redirect to another public host', async () => {
    lookup.mockResolvedValue(PUBLIC)
    fetchMock
      .mockResolvedValueOnce(redirectTo('https://recipes.example/final'))
      .mockResolvedValueOnce(htmlResponse('<html>' + 'y'.repeat(600) + '</html>'))

    const result = await fetchSimple('https://example.com/recipe')

    expect(result).toContain('yyy')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('https://recipes.example/final')
  })

  it('resolves a relative Location against the current URL', async () => {
    lookup.mockResolvedValue(PUBLIC)
    fetchMock
      .mockResolvedValueOnce(redirectTo('/moved/here'))
      .mockResolvedValueOnce(htmlResponse('z'.repeat(600)))

    await fetchSimple('https://example.com/a/b')

    expect(fetchMock.mock.calls[1][0]).toBe('https://example.com/moved/here')
  })

  it('gives up after too many redirects instead of looping forever', async () => {
    lookup.mockResolvedValue(PUBLIC)
    fetchMock.mockResolvedValue(redirectTo('https://example.com/again'))

    const result = await fetchSimple('https://example.com/start')

    expect(result).toBeNull()
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(7)
  })

  it('rejects a body larger than the cap via content-length', async () => {
    lookup.mockResolvedValue(PUBLIC)
    fetchMock.mockResolvedValueOnce(
      new Response('small', {
        status: 200,
        headers: { 'content-length': String(50 * 1024 * 1024) },
      })
    )

    expect(await fetchSimple('https://example.com/huge')).toBeNull()
  })

  it('still refuses a private address on the very first hop', async () => {
    lookup.mockResolvedValue(METADATA)
    fetchMock.mockResolvedValue(htmlResponse('x'.repeat(600)))

    expect(await fetchSimple('http://169.254.169.254/')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
