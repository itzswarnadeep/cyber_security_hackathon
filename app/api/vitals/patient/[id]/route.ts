import { type NextRequest, NextResponse } from "next/server"
import { getRecentVitals } from "@/lib/db"
import { tryDecrypt } from "@/lib/encryption"
import { readSession, unauthorized } from "@/lib/auth"
import type { StoredVitals } from "@/lib/types"

// GET /api/vitals/patient/PAT001?limit=20  (staff only)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!readSession(req)) return unauthorized()

  const { id } = await params
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 20, 1), 100)

  try {
    const rows = await getRecentVitals(id, 120, limit)
    const vitals = rows.flatMap((row) => {
      const v = tryDecrypt<StoredVitals>(row.encrypted_data)
      if (!v) return []
      return [{ recordedAt: row.recorded_at, heartRate: v.heartRate, spo2: v.spo2, temperature: v.temperature }]
    })
    return NextResponse.json({ vitals })
  } catch (error) {
    console.error("vitals/patient failed:", error)
    return NextResponse.json({ error: "Could not load readings" }, { status: 500 })
  }
}
