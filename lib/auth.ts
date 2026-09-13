import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"

export const SESSION_COOKIE = "medcare_session"
export const SESSION_MAX_AGE = 8 * 60 * 60 // one shift

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is missing. Run: npm run keys")
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url")
}

// hash first so timingSafeEqual always gets equal-length buffers
function safeEqual(a: string, b: string) {
  const hashA = crypto.createHash("sha256").update(a).digest()
  const hashB = crypto.createHash("sha256").update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

export function checkPassword(password: string) {
  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected) throw new Error("DASHBOARD_PASSWORD is missing")
  return safeEqual(password, expected)
}

// token = base64url(name).expiry.signature
export function createSessionToken(staffName: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  const payload = `${Buffer.from(staffName).toString("base64url")}.${expires}`
  return `${payload}.${sign(payload)}`
}

export function readSession(req: NextRequest): { staffName: string } | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const [name, expires, signature] = token?.split(".") ?? []
  if (!name || !expires || !signature) return null

  try {
    if (!safeEqual(signature, sign(`${name}.${expires}`))) return null
  } catch {
    return null
  }
  if (Number(expires) < Date.now() / 1000) return null

  return { staffName: Buffer.from(name, "base64url").toString() }
}

export function unauthorized() {
  return NextResponse.json({ error: "Login required" }, { status: 401 })
}
