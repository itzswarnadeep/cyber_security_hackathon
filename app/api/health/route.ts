import { NextResponse } from "next/server"
import { ping } from "@/lib/db"
import { AMBULANCES } from "@/lib/fleet"

export const dynamic = "force-dynamic"

// Setup checklist for the simulator page. Only says what is set, never the values.
export async function GET() {
  let database = "not configured"
  if (process.env.DATABASE_URL) {
    database = await ping().then(
      () => "connected",
      () => "unreachable (check DATABASE_URL, then run npm run db:setup)",
    )
  }

  return NextResponse.json({
    database,
    encryptionKey: Boolean(process.env.ENCRYPTION_KEY),
    sessionSecret: Boolean(process.env.SESSION_SECRET),
    dashboardPassword: Boolean(process.env.DASHBOARD_PASSWORD),
    deviceKeys: AMBULANCES.filter((id) => Boolean(process.env[`DEVICE_KEY_${id}`])),
  })
}
