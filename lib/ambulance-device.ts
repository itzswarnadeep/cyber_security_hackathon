// Runs in the browser (the ambulance side). WebCrypto only, no server imports here.
import type { SealedEnvelope, VitalsPacket } from "./types"

const encoder = new TextEncoder()

export function toBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

// AES-256-GCM with the ambulance id as additional data, so a packet can't be
// re-labelled as coming from a different ambulance.
export async function sealVitals(keyBase64: string, ambulanceId: string, packet: VitalsPacket): Promise<SealedEnvelope> {
  const raw = fromBase64(keyBase64.trim())
  if (raw.length !== 32) throw new Error("Device key must be 32 bytes (base64)")

  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(ambulanceId) },
    key,
    encoder.encode(JSON.stringify(packet)),
  )

  return { ambulanceId, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) }
}

export interface TransmitResult {
  ok: boolean
  status: number
  data: { error?: string; details?: string[]; status?: string; vitalId?: number }
}

export async function transmitEnvelope(envelope: SealedEnvelope): Promise<TransmitResult> {
  const res = await fetch("/api/vitals/transmit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
  })
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  return { ok: res.ok, status: res.status, data }
}
