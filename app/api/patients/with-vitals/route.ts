import { type NextRequest, NextResponse } from "next/server"
import { getPatientsWithLatestVital } from "@/lib/db"
import { tryDecrypt } from "@/lib/encryption"
import { readSession, unauthorized } from "@/lib/auth"
import type { StoredVitals } from "@/lib/types"

// GET /api/patients/with-vitals  (staff only)
export async function GET(req: NextRequest) {
  if (!readSession(req)) return unauthorized()

  try {
    const rows = await getPatientsWithLatestVital()
    const patients = rows.map((row) => {
      const v = tryDecrypt<StoredVitals>(row.encrypted_data)
      return {
        id: row.patient_id,
        name: row.name,
        age: row.age,
        conditions: row.medical_conditions,
        status: row.status,
        ambulanceId: row.ambulance_id,
        vitals: v && {
          heartRate: v.heartRate,
          spo2: v.spo2,
          systolicBp: v.systolicBp,
          diastolicBp: v.diastolicBp,
          temperature: v.temperature,
          recordedAt: row.recorded_at,
        },
      }
    })
    return NextResponse.json({ patients })
  } catch (error) {
    console.error("patients/with-vitals failed:", error)
    return NextResponse.json({ error: "Could not load patients" }, { status: 500 })
  }
}
