"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { fromBase64, sealVitals, toBase64, transmitEnvelope, type TransmitResult } from "@/lib/ambulance-device"
import { AMBULANCES } from "@/lib/fleet"
import type { SealedEnvelope, VitalsPacket } from "@/lib/types"

export interface SentPacket {
  packet: VitalsPacket
  envelope: SealedEnvelope
  result: TransmitResult
}

type Attack = "replay" | "tamper" | "relabel" | "spoof" | "delayed"

const ATTACKS: { id: Attack; title: string; description: string }[] = [
  { id: "replay", title: "Replay", description: "Send the last captured packet again, unchanged." },
  { id: "tamper", title: "Tamper", description: "Flip one bit in the captured ciphertext." },
  { id: "relabel", title: "Relabel", description: "Claim the captured packet came from another ambulance." },
  { id: "spoof", title: "Spoof", description: "Send fake 'all normal' vitals without knowing the key." },
  { id: "delayed", title: "Delayed", description: "Send a properly sealed packet that is 5 minutes old." },
]

// what an attacker would inject to hide a critical patient
const NORMAL_VITALS = { heartRate: 72, spo2: 98, systolicBp: 120, diastolicBp: 80, temperature: 37 }

export function SecurityLab({
  lastPacket,
  deviceKey,
  ambulanceId,
  patientId,
}: {
  lastPacket: SentPacket | null
  deviceKey: string | null
  ambulanceId: string
  patientId: string
}) {
  const [results, setResults] = useState<Partial<Record<Attack, TransmitResult>>>({})
  const [running, setRunning] = useState(false)

  const captured = lastPacket?.envelope

  function canRun(id: Attack) {
    if (id === "replay") return !!lastPacket?.result.ok
    if (id === "tamper" || id === "relabel") return !!captured
    if (id === "delayed") return !!deviceKey
    return true
  }

  async function attack(id: Attack) {
    if (id === "replay") return transmitEnvelope(captured!)

    if (id === "tamper") {
      const bytes = fromBase64(captured!.ciphertext)
      bytes[0] ^= 1
      return transmitEnvelope({ ...captured!, ciphertext: toBase64(bytes) })
    }

    if (id === "relabel") {
      const other = AMBULANCES.find((a) => a !== captured!.ambulanceId) ?? "AMB999"
      return transmitEnvelope({ ...captured!, ambulanceId: other })
    }

    if (id === "spoof") {
      const guessedKey = toBase64(crypto.getRandomValues(new Uint8Array(32)))
      return transmitEnvelope(await sealVitals(guessedKey, ambulanceId, { patientId, ...NORMAL_VITALS, ts: Date.now() }))
    }

    const fiveMinAgo = Date.now() - 5 * 60_000
    return transmitEnvelope(await sealVitals(deviceKey!, ambulanceId, { patientId, ...NORMAL_VITALS, ts: fiveMinAgo }))
  }

  async function run(ids: Attack[]) {
    setRunning(true)
    for (const id of ids) {
      const result = await attack(id).catch((err): TransmitResult => ({ ok: false, status: 0, data: { error: String(err) } }))
      setResults((prev) => ({ ...prev, [id]: result }))
    }
    setRunning(false)
  }

  const runnable = ATTACKS.map((a) => a.id).filter(canRun)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Security Lab
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => run(runnable)} disabled={running || !runnable.length}>
            {running ? "Running..." : "Run all attacks"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastPacket ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-muted-foreground mb-1">On the device</p>
              <pre className="bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(lastPacket.packet, null, 2)}</pre>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground mb-1">On the network (what an attacker sees)</p>
              <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify({ ...lastPacket.envelope, ciphertext: lastPacket.envelope.ciphertext.slice(0, 60) + "..." }, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Send one reading first so there is a packet to attack.</p>
        )}

        <ul className="divide-y divide-border">
          {ATTACKS.map(({ id, title, description }) => {
            const result = results[id]
            const blocked = result?.status === 401 || result?.status === 409
            return (
              <li key={id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  {result && (
                    <p className="text-xs mt-1 font-mono">
                      {result.status}: {result.data.error ?? "accepted"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {result &&
                    (blocked ? (
                      <Badge className="bg-green-600 text-white">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Blocked
                      </Badge>
                    ) : (
                      <Badge variant="destructive">{result.ok ? "Accepted" : "Error"}</Badge>
                    ))}
                  <Button size="sm" variant="secondary" onClick={() => run([id])} disabled={running || !canRun(id)}>
                    Run
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
