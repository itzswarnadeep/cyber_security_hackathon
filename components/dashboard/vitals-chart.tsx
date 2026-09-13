"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertCircle } from "lucide-react"

interface VitalRecord {
  time: string
  heartRate: number
  spo2: number
  temperature: number
}

interface VitalsResponse {
  vitals: { recordedAt: string; heartRate: number; spo2: number; temperature: number }[]
}

export function VitalsChart({ patientId, onUnauthorized }: { patientId: string; onUnauthorized: () => void }) {
  const [data, setData] = useState<VitalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setData([])

    const fetchVitals = async () => {
      try {
        const response = await fetch(`/api/vitals/patient/${patientId}?limit=20`)
        if (response.status === 401) return onUnauthorized()
        if (!response.ok) throw new Error(`Failed to fetch vitals: ${response.statusText}`)

        const result: VitalsResponse = await response.json()
        setData(
          result.vitals.map((v) => ({
            time: new Date(v.recordedAt).toLocaleTimeString(),
            heartRate: v.heartRate,
            spo2: v.spo2,
            temperature: v.temperature,
          })),
        )
        setError(null)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch vitals")
      } finally {
        setLoading(false)
      }
    }

    fetchVitals()
    const interval = setInterval(fetchVitals, 5000)
    return () => clearInterval(interval)
  }, [patientId, onUnauthorized])

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-start gap-2 text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading chart</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !data.length) {
    return (
      <div className="text-center text-muted-foreground h-96 flex items-center justify-center">
        {loading ? "Loading vitals data..." : "No readings in the last 2 hours. Send some from the simulator."}
      </div>
    )
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          {/* no animation: the chart refreshes every 5s and would redraw from scratch each time */}
          <Line type="monotone" dataKey="heartRate" stroke="#ef4444" name="Heart Rate (bpm)" strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="spo2" stroke="#3b82f6" name="SpO₂ (%)" strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="temperature" stroke="#f59e0b" name="Temperature (°C)" strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
