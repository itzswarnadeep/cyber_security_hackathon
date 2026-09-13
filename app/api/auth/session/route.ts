import { type NextRequest, NextResponse } from "next/server"
import { readSession, unauthorized } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = readSession(req)
  return session ? NextResponse.json(session) : unauthorized()
}
