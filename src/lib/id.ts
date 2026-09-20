/**
 * Id generation. Ids are opaque strings; the optional `prefix` only exists to make
 * them readable while debugging (`ing:…`, `grp:…`) and to namespace seed ids.
 */

const HEX = '0123456789abcdef'

/** RFC-4122 v4 shaped fallback for environments without `crypto.randomUUID`. */
function fallbackUuid(): string {
  const bytes = new Uint8Array(16)
  const cryptoObj: Crypto | undefined = globalThis.crypto

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }

  // Version 4, variant 10xx.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += '-'
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f]
  }
  return out
}

/**
 * A fresh unique id. With `prefix` the result is `${prefix}:${uuid}`.
 */
export function newId(prefix?: string): string {
  const cryptoObj: Crypto | undefined = globalThis.crypto
  let uuid: string

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    try {
      uuid = cryptoObj.randomUUID()
    } catch {
      uuid = fallbackUuid()
    }
  } else {
    uuid = fallbackUuid()
  }

  return prefix ? `${prefix}:${uuid}` : uuid
}
