"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, Droplet, Gauge, Thermometer, AlertCircle } from "lucide-react"
import type { PatientStatus } from "@/lib/types"

export interface DashboardPatient {
  id: string
  name: string
  age: number | null
  conditions: string | null
  status: PatientStatus | null
  ambulanceId: string | null
  vitals: {
    heartRate: number
    spo2: number
    systolicBp: number
    diastolicBp: number
    temperature: number
    recordedAt: string
  } | null
}

const cardColor: Record<PatientStatus, string> = {
  Critical: "border-red-500 bg-red-50",
  Moderate: "border-yellow-500 bg-yellow-50",
  Stable: "border-green-500 bg-green-50",
}

const badgeColor: Record<PatientStatus, string> = {
  Critical: "bg-red-600 text-white",
  Moderate: "bg-yellow-600 text-white",
  Stable: "bg-green-600 text-white",
}

function Reading({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  )
}

export function PatientGrid({
  patients,
  loading,
  error,
  selectedPatient,
  onSelectPatient,
}: {
  patients: DashboardPatient[]
  loading: boolean
  error: string | null
  selectedPatient: string | null
  onSelectPatient: (patientId: string) => void
}) {
  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Error loading patients</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (loading && patients.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-16 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {patients.map((p) => (
        <Card
          key={p.id}
          onClick={() => onSelectPatient(p.id)}
          className={`p-5 cursor-pointer border-2 transition-all hover:shadow-lg ${p.status ? cardColor[p.status] : ""} ${
            selectedPatient === p.id ? "ring-2 ring-primary" : ""
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {p.id}
                  {p.age && `, ${p.age} y`}
                  {p.conditions && `, ${p.conditions}`}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${p.status ? badgeColor[p.status] : "bg-muted text-muted-foreground"}`}
              >
                {p.status ?? "No data"}
              </span>
            </div>

            {p.vitals ? (
              <>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <Reading icon={Activity} label="Heart rate" value={`${p.vitals.heartRate} bpm`} />
                  <Reading icon={Droplet} label="SpO2" value={`${p.vitals.spo2}%`} />
                  <Reading icon={Gauge} label="Blood pressure" value={`${p.vitals.systolicBp}/${p.vitals.diastolicBp}`} />
                  <Reading icon={Thermometer} label="Temp" value={`${p.vitals.temperature}°C`} />
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  {p.ambulanceId}, last update {new Date(p.vitals.recordedAt).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground pt-3 border-t border-border">No readings yet</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
