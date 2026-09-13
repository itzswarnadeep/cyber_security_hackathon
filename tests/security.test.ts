// npm test  (uses node's built-in test runner)
import { test } from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { fromBase64, sealVitals, toBase64 } from "../lib/ambulance-device.ts"
import { decryptFromStorage, encryptForStorage, openEnvelope } from "../lib/encryption.ts"
import { classifyPatientCondition } from "../lib/classification.ts"

const deviceKey = randomBytes(32)
const deviceKeyB64 = deviceKey.toString("base64")
const packet = { patientId: "PAT001", heartRate: 88, spo2: 97, systolicBp: 125, diastolicBp: 82, temperature: 37.1, ts: Date.now() }

test("device-sealed packet opens on the server with the same key", async () => {
  const envelope = await sealVitals(deviceKeyB64, "AMB001", packet)
  assert.deepEqual(openEnvelope(envelope, deviceKey), packet)
})

test("network only sees ciphertext", async () => {
  const envelope = await sealVitals(deviceKeyB64, "AMB001", packet)
  assert.ok(!envelope.ciphertext.includes("PAT001"))
  assert.ok(!Buffer.from(envelope.ciphertext, "base64").toString("latin1").includes("PAT001"))
})

test("flipping one bit is detected", async () => {
  const envelope = await sealVitals(deviceKeyB64, "AMB001", packet)
  const bytes = fromBase64(envelope.ciphertext)
  bytes[5] ^= 0x01
  assert.throws(() => openEnvelope({ ...envelope, ciphertext: toBase64(bytes) }, deviceKey))
})

test("a packet sealed with another key is rejected (spoofing)", async () => {
  const envelope = await sealVitals(randomBytes(32).toString("base64"), "AMB001", packet)
  assert.throws(() => openEnvelope(envelope, deviceKey))
})

test("relabelling a packet with another ambulance ID is rejected", async () => {
  const envelope = await sealVitals(deviceKeyB64, "AMB001", packet)
  assert.throws(() => openEnvelope({ ...envelope, ambulanceId: "AMB002" }, deviceKey))
})

test("storage encryption round-trips and uses a fresh IV each time", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64")
  const first = encryptForStorage({ heartRate: 90 })
  const second = encryptForStorage({ heartRate: 90 })
  assert.notEqual(first, second)
  assert.deepEqual(decryptFromStorage(first), { heartRate: 90 })
})

test("triage: normal vitals are Stable, one critical value is Critical", () => {
  assert.equal(classifyPatientCondition({ heartRate: 75, spo2: 98, systolicBp: 120, diastolicBp: 80, temperature: 37 }).status, "Stable")
  assert.equal(classifyPatientCondition({ heartRate: 150, spo2: 98, systolicBp: 120, diastolicBp: 80, temperature: 37 }).status, "Critical")
  assert.equal(classifyPatientCondition({ heartRate: 125, spo2: 98, systolicBp: 120, diastolicBp: 80, temperature: 37 }).status, "Moderate")
})
