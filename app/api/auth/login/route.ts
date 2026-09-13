import { type NextRequest, NextResponse } from "next/server"
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth"

// POST /api/auth/login  { name, password }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (!name || name.length > 60 || !password) {
    return NextResponse.json({ error: "Name and password are required" }, { status: 400 })
  }

  try {
    if (!checkPassword(password)) {
      await new Promise((r) => setTimeout(r, 500)) // slows down guessing
      return NextResponse.json({ error: "Wrong password" }, { status: 401 })
    }

    const res = NextResponse.json({ staffName: name })
    res.cookies.set(SESSION_COOKIE, createSessionToken(name), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })
    return res
  } catch (error) {
    console.error("login failed:", error)
    return NextResponse.json({ error: "Login is not configured on the server" }, { status: 500 })
  }
}
