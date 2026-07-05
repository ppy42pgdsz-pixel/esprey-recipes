/**
 * Minimal Web Push implementation for Cloudflare Workers (WebCrypto only).
 * - VAPID authentication (RFC 8292): an ES256 JWT proves we own the key pair
 *   the browser subscribed with.
 * - Payload encryption (RFC 8291, aes128gcm): the payload is encrypted so only
 *   the subscribed device can read it.
 */

export interface PushEnv {
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
}

const te = new TextEncoder()

function b64uDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4
  if (pad) s += '='.repeat(4 - pad)
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function b64uEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  bits: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bits)
  )
}

/** Build the `Authorization: vapid ...` header for a push endpoint. */
async function vapidAuthHeader(endpoint: string, env: PushEnv): Promise<string> {
  const publicRaw = b64uDecode(env.VAPID_PUBLIC_KEY) // 65 bytes: 0x04 || x || y
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: b64uEncode(publicRaw.slice(1, 33)),
    y: b64uEncode(publicRaw.slice(33, 65)),
    d: env.VAPID_PRIVATE_KEY,
  }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ])
  const enc = (obj: unknown) => b64uEncode(te.encode(JSON.stringify(obj)))
  const unsigned =
    enc({ typ: 'JWT', alg: 'ES256' }) +
    '.' +
    enc({
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: env.VAPID_SUBJECT,
    })
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned))
  )
  return `vapid t=${unsigned}.${b64uEncode(signature)}, k=${env.VAPID_PUBLIC_KEY}`
}

/** Encrypt the payload for one subscription (RFC 8291, aes128gcm). */
async function encryptPayload(p256dh: string, auth: string, payload: string): Promise<Uint8Array> {
  const uaPublic = b64uDecode(p256dh)
  const authSecret = b64uDecode(auth)

  const asKeys = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  // Cast needed: workers-types names this parameter `$public`, the runtime
  // follows the WebCrypto standard and expects `public`.
  const ecdhParams = { name: 'ECDH', public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(ecdhParams, asKeys.privateKey, 256)
  )
  const asPublic = new Uint8Array(
    (await crypto.subtle.exportKey('raw', asKeys.publicKey)) as ArrayBuffer
  )

  const ikm = await hkdf(
    authSecret,
    sharedSecret,
    concat(te.encode('WebPush: info\0'), uaPublic, asPublic),
    256
  )
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const contentKey = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 128)
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 96)

  const aesKey = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      concat(te.encode(payload), new Uint8Array([2])) // 0x02 = last-record delimiter
    )
  )

  // aes128gcm body header: salt(16) | record size(4, 4096) | key id length(1) | as public key(65)
  const header = concat(
    salt,
    new Uint8Array([0, 0, 16, 0]),
    new Uint8Array([asPublic.length]),
    asPublic
  )
  return concat(header, ciphertext)
}

/** Send one push message. Returns the HTTP status (404/410 = subscription gone). */
export async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  env: PushEnv
): Promise<number> {
  const body = await encryptPayload(p256dh, auth, payload)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '300',
      Urgency: 'high',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: await vapidAuthHeader(endpoint, env),
    },
    body,
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.log(`push to ${new URL(endpoint).origin} failed: ${res.status} ${await res.text()}`)
  }
  return res.status
}
