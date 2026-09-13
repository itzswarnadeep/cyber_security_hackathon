import { type NextRequest, NextResponse } from "next/server"
import { encryptForStorage, getDeviceKey, openEnvelope } from "@/lib/encryption"
import { createAlert, getPatient, isDuplicate, storeVitals } from "@/lib/db"
import { classifyPatientCondition, generateAlertMessage, shouldTriggerAlert } from "@/lib/classification"
import { validateVitals } from "@/lib/vital-validator"
import type { SealedEnvelope, StoredVitals, VitalsPacket } from "@/lib/types"

const MAX_AGE_MS = 60_000

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

function isEnvelope(body: unknown): body is SealedEnvelope {
  const b = body as Partial<SealedEnvelope> | null
  return typeof b?.ambulanceId === "string" && typeof b.iv === "string" && typeof b.ciphertext === "string" && b.ciphertext.length < 8192
}

// POST /api/vitals/transmit  { ambulanceId, iv, ciphertext }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isEnvelope(body)) return fail(400, "Expected { ambulanceId, iv, ciphertext }")

  // Same answer for "unknown ambulance" and "bad key / tampered", so the
  // response doesn't tell an attacker which ambulance ids exist.
  const key = getDeviceKey(body.ambulanceId)
  let packet: VitalsPacket
  try {
    if (!key) throw new Error("no key")
    packet = openEnvelope(body, key)
  } catch {
    return fail(401, "Rejected: packet not sealed by a registered ambulance, or modified in transit")
  }

  if (typeof packet.ts !== "number" || Math.abs(Date.now() - packet.ts) > MAX_AGE_MS) {
    return fail(401, "Rejected: packet is too old (possible replay)")
  }

  const vitals = {
    heartRate: packet.heartRate,
    spo2: packet.spo2,
    systolicBp: packet.systolicBp,
    diastolicBp: packet.diastolicBp,
    temperature: packet.temperature,
  }
  if (typeof packet.patientId !== "string" || !Object.values(vitals).every(Number.isFinite)) {
    return fail(400, "Packet is missing patientId or readings")
  }
  const check = validateVitals(vitals)
  if (!check.isValid) {
    return NextResponse.json({ error: "Invalid vital readings", details: check.errors }, { status: 400 })
  }

  try {
    if (!(await getPatient(packet.patientId))) return fail(404, "Unknown patient")

    const triage = classifyPatientCondition(vitals)
    const stored: StoredVitals = { ...vitals, deviceTimestamp: packet.ts }
    const vitalId = await storeVitals({
      patientId: packet.patientId,
      ambulanceId: body.ambulanceId,
      status: triage.status,
      encryptedData: encryptForStorage(stored),
      nonce: `${body.ambulanceId}:${body.iv}`,
    })

    if (shouldTriggerAlert(triage)) {
      await createAlert(packet.patientId, encryptForStorage(generateAlertMessage(triage.riskFactors)))
    }

    return NextResponse.json({ vitalId, status: triage.status }, { status: 201 })
  } catch (error) {
    // still inside the time window, but the nonce is already stored
    if (isDuplicate(error)) return fail(409, "Rejected: this packet was already received (replay)")
    console.error("transmit failed:", error)
    return fail(500, "Could not store the reading")
  }
}
