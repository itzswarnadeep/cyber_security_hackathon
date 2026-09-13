"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Radio } from "lucide-react"
import { VitalsForm } from "@/components/simulator/vitals-form"
import { SimulationStatus } from "@/components/simulator/simulation-status"
import { ServerStatus } from "@/components/simulator/server-status"
import { DeviceKeyCard } from "@/components/simulator/device-key"
import { SecurityLab, type SentPacket } from "@/components/simulator/security-lab"
import { sealVitals, transmitEnvelope } from "@/lib/ambulance-device"
import { AMBULANCES, PATIENTS } from "@/lib/fleet"
import type { VitalReadings } from "@/lib/classification"

const keyName = (ambulanceId: string) => `device-key:${ambulanceId}`

function randomVitals(): VitalReadings {
  const around = (base: number, spread: number) => base + (Math.random() - 0.5) * spread
  return {
    heartRate: Math.round(around(70, 20)),
    spo2: Math.min(100, Number(around(95, 10).toFixed(1))),
    systolicBp: Math.round(around(120, 30)),
    diastolicBp: Math.round(around(80, 20)),
    temperature: Number(around(37, 3).toFixed(1)),
  }
}

export default function SimulatorPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [transmissionCount, setTransmissionCount] = useState(0)
  const [lastTransmissionTime, setLastTransmissionTime] = useState<string | null>(null)
  const [patientId, setPatientId] = useState(PATIENTS[0].id)
  const [ambulanceId, setAmbulanceId] = useState(AMBULANCES[0])
  const [deviceKeys, setDeviceKeys] = useState<Record<string, string>>({})
  const [lastPacket, setLastPacket] = useState<SentPacket | null>(null)

  const deviceKey = deviceKeys[ambulanceId] ?? null

  useEffect(() => {
    // sessionStorage can throw in private mode, then keys just don't survive a reload
    try {
      const saved: Record<string, string> = {}
      for (const id of AMBULANCES) {
        const key = sessionStorage.getItem(keyName(id))
        if (key) saved[id] = key
      }
      setDeviceKeys(saved)
    } catch {}
  }, [])

  function saveDeviceKey(key: string | null) {
    setDeviceKeys((prev) => {
      const next = { ...prev }
      if (key) next[ambulanceId] = key
      else delete next[ambulanceId]
      return next
    })
    try {
      if (key) sessionStorage.setItem(keyName(ambulanceId), key)
      else sessionStorage.removeItem(keyName(ambulanceId))
    } catch {}
    if (!key) setIsRunning(false)
  }

  const sendVitals = useCallback(
    async (vitals: VitalReadings) => {
      if (!deviceKey) throw new Error(`Add the device key for ${ambulanceId} first`)

      const packet = { patientId, ...vitals, ts: Date.now() }
      const envelope = await sealVitals(deviceKey, ambulanceId, packet)
      const result = await transmitEnvelope(envelope)

      setLastPacket({ packet, envelope, result })
      if (result.ok) {
        setTransmissionCount((n) => n + 1)
        setLastTransmissionTime(new Date().toLocaleTimeString())
      }
      return result
    },
    [deviceKey, patientId, ambulanceId],
  )

  useEffect(() => {
    if (!isRunning) return
    const tick = () => sendVitals(randomVitals()).catch((err) => console.error(err))
    tick()
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [isRunning, sendVitals])

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Radio className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ambulance Simulator</h1>
              <p className="text-sm text-muted-foreground">Acts as the device inside the ambulance</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Home
          </Link>
        </div>

        <ServerStatus />

        <Card>
          <CardHeader>
            <CardTitle>Simulation Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Patient</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  {PATIENTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Ambulance</label>
                <select
                  value={ambulanceId}
                  onChange={(e) => setAmbulanceId(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  {AMBULANCES.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <Button
                onClick={() => setIsRunning(!isRunning)}
                variant={isRunning ? "destructive" : "default"}
                size="lg"
                className="flex-1"
                disabled={!deviceKey}
              >
                <Activity className="w-4 h-4 mr-2" />
                {isRunning ? "Stop Simulation" : "Start Simulation"}
              </Button>
            </div>

            <SimulationStatus
              isRunning={isRunning}
              transmissionCount={transmissionCount}
              lastTransmissionTime={lastTransmissionTime}
            />
          </CardContent>
        </Card>

        <DeviceKeyCard ambulanceId={ambulanceId} deviceKey={deviceKey} onSave={saveDeviceKey} />

        <VitalsForm onSend={sendVitals} disabled={!deviceKey} />

        <SecurityLab lastPacket={lastPacket} deviceKey={deviceKey} ambulanceId={ambulanceId} patientId={patientId} />
      </div>
    </main>
  )
}
