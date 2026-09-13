"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"
import { AMBULANCES } from "@/lib/fleet"

interface Health {
  database: string
  encryptionKey: boolean
  sessionSecret: boolean
  dashboardPassword: boolean
  deviceKeys: string[]
}

export function ServerStatus() {
  const [health, setHealth] = useState<Health | null>(null)
  const [unreachable, setUnreachable] = useState(false)

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setUnreachable(true))
  }, [])

  if (unreachable) return <p className="text-sm text-destructive">Server not reachable.</p>
  if (!health) return null

  const checks = [
    { label: "Database", ok: health.database === "connected", missing: health.database },
    { label: "Storage key", ok: health.encryptionKey, missing: "ENCRYPTION_KEY" },
    { label: "Session secret", ok: health.sessionSecret, missing: "SESSION_SECRET" },
    { label: "Dashboard password", ok: health.dashboardPassword, missing: "DASHBOARD_PASSWORD" },
    ...AMBULANCES.map((id) => ({
      label: `Device key ${id}`,
      ok: health.deviceKeys.includes(id),
      missing: `DEVICE_KEY_${id}`,
    })),
  ]

  // nothing to show once setup is complete
  if (checks.every((c) => c.ok)) return null

  return (
    <Card className="border-yellow-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          Setup incomplete
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              {c.ok ? (
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
              )}
              {c.label}
              {!c.ok && <code className="text-xs text-muted-foreground">{c.missing}</code>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          Fill these in <code>.env.local</code>, run <code>npm run db:setup</code> and restart <code>npm run dev</code>.
        </p>
      </CardContent>
    </Card>
  )
}
