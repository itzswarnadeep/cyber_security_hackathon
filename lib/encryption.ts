import crypto from "crypto"
import type { SealedEnvelope, VitalsPacket } from "./types"

const IV_BYTES = 12
const TAG_BYTES = 16

function readKey(name: string): Buffer | null {
  const value = process.env[name]
  if (!value) return null
  const key = Buffer.from(value.trim(), "base64")
  if (key.length !== 32) {
    console.error(`${name} must be 32 bytes, base64 encoded. Run: npm run keys`)
    return null
  }
  return key
}

function storageKey() {
  const key = readKey("ENCRYPTION_KEY")
  if (!key) throw new Error("ENCRYPTION_KEY is missing or invalid")
  return key
}

export function getDeviceKey(ambulanceId: string) {
  if (!/^AMB\d{3}$/.test(ambulanceId)) return null
  return readKey(`DEVICE_KEY_${ambulanceId}`)
}

// Stored format: iv:ciphertext:tag (base64 parts)
export function encryptForStorage(data: unknown) {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv("aes-256-gcm", storageKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()])
  return [iv, ciphertext, cipher.getAuthTag()].map((part) => part.toString("base64")).join(":")
}

export function decryptFromStorage<T>(stored: string): T {
  const [iv, ciphertext, tag] = stored.split(":").map((part) => Buffer.from(part, "base64"))
  if (!iv || !ciphertext || !tag) throw new Error("Bad stored ciphertext")

  const decipher = crypto.createDecipheriv("aes-256-gcm", storageKey(), iv, { authTagLength: TAG_BYTES })
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plaintext.toString("utf8"))
}

// Returns null instead of throwing, e.g. rows written before a key change.
export function tryDecrypt<T>(stored: string | null): T | null {
  if (!stored) return null
  try {
    return decryptFromStorage<T>(stored)
  } catch {
    return null
  }
}

// Counterpart of sealVitals() in ambulance-device.ts. WebCrypto appends the
// 16 byte tag to the ciphertext, Node wants it separately.
// Throws on a wrong key, any modified byte, or a changed ambulanceId.
export function openEnvelope(envelope: SealedEnvelope, deviceKey: Buffer): VitalsPacket {
  const iv = Buffer.from(envelope.iv, "base64")
  const sealed = Buffer.from(envelope.ciphertext, "base64")
  if (iv.length !== IV_BYTES || sealed.length <= TAG_BYTES) throw new Error("Malformed envelope")

  const decipher = crypto.createDecipheriv("aes-256-gcm", deviceKey, iv, { authTagLength: TAG_BYTES })
  decipher.setAAD(Buffer.from(envelope.ambulanceId, "utf8"))
  decipher.setAuthTag(sealed.subarray(-TAG_BYTES))
  const plaintext = Buffer.concat([decipher.update(sealed.subarray(0, -TAG_BYTES)), decipher.final()])
  return JSON.parse(plaintext.toString("utf8"))
}
