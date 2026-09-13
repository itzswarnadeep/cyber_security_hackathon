import { type NextRequest, NextResponse } from "next/server"
import { getActiveAlerts } from "@/lib/db"
import { tryDecrypt } from "@/lib/encryption"
import { readSession, unauthorized } from "@/lib/auth"

// GET /api/alerts/active  (staff only)
export async function GET(req: NextRequest) {
  if (!readSession(req)) return unauthorized()

  try {
    const rows = await getActiveAlerts()
    const alerts = rows.map((a) => ({
      id: a.id,
      patientId: a.patient_id,
      alertLevel: a.alert_level,
      message: tryDecrypt<string>(a.encrypted_message) ?? "(could not decrypt)",
      createdAt: a.created_at,
    }))
    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("alerts/active failed:", error)
    return NextResponse.json({ error: "Could not load alerts" }, { status: 500 })
  }
}
