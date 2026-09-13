import { type NextRequest, NextResponse } from "next/server"
import { acknowledgeAlert } from "@/lib/db"
import { readSession, unauthorized } from "@/lib/auth"

// POST /api/alerts/acknowledge  { alertId }  (staff only)
export async function POST(req: NextRequest) {
  const session = readSession(req)
  if (!session) return unauthorized()

  const body = await req.json().catch(() => null)
  const alertId = Number(body?.alertId)
  if (!Number.isInteger(alertId) || alertId <= 0) {
    return NextResponse.json({ error: "alertId must be a positive integer" }, { status: 400 })
  }

  try {
    // name comes from the session, never from the request body
    const done = await acknowledgeAlert(alertId, session.staffName)
    if (!done) return NextResponse.json({ error: "Alert not found or already acknowledged" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("alerts/acknowledge failed:", error)
    return NextResponse.json({ error: "Could not acknowledge alert" }, { status: 500 })
  }
}
