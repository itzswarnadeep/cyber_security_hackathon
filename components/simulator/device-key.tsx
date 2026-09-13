"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KeyRound, CheckCircle } from "lucide-react"
import { fromBase64 } from "@/lib/ambulance-device"

// In a real ambulance the key would sit in the device's secure storage.
// For the demo it's kept in this tab's sessionStorage (see simulator page).
export function DeviceKeyCard({
  ambulanceId,
  deviceKey,
  onSave,
}: {
  ambulanceId: string
  deviceKey: string | null
  onSave: (key: string | null) => void
}) {
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")

  function save() {
    let valid = false
    try {
      valid = fromBase64(draft.trim()).length === 32
    } catch {}
    if (!valid) return setError("Not a valid device key. Copy it from .env.local")
    onSave(draft.trim())
    setDraft("")
    setError("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="w-4 h-4" />
          Device key for {ambulanceId}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deviceKey ? (
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              Key loaded. Readings are encrypted here before they are sent.
            </p>
            <Button variant="outline" size="sm" onClick={() => onSave(null)}>
              Remove
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Paste <code>DEVICE_KEY_{ambulanceId}</code> from <code>.env.local</code>. The hospital only accepts
              packets sealed with this key.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`DEVICE_KEY_${ambulanceId}`}
                autoComplete="off"
              />
              <Button onClick={save} disabled={!draft.trim()}>
                Save
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
