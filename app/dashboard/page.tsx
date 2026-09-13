"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { PatientGrid, type DashboardPatient } from "@/components/dashboard/patient-grid"
import { AlertPanel, type DashboardAlert } from "@/components/dashboard/alert-panel"
import { VitalsChart } from "@/components/dashboard/vitals-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState<string | null>(null)
  const [patients, setPatients] = useState<DashboardPatient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsError, setPatientsError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)

  const goToLogin = useCallback(() => router.replace("/login"), [router])

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (res) => {
        if (!res.ok) return goToLogin()
        setStaffName((await res.json()).staffName)
      })
      .catch(goToLogin)
  }, [goToLogin])

  // patients every 3s, alerts every 5s
  useEffect(() => {
    if (!staffName) return

    const fetchPatients = async () => {
      try {
        const res = await fetch("/api/patients/with-vitals")
        if (res.status === 401) return goToLogin()
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? res.statusText)
        setPatients(data.patients)
        setPatientsError(null)
      } catch (err) {
        setPatientsError(err instanceof Error ? err.message : "Could not load patients")
      } finally {
        setPatientsLoading(false)
      }
    }

    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/alerts/active")
        if (res.status === 401) return goToLogin()
        if (res.ok) setAlerts((await res.json()).alerts)
      } catch (err) {
        console.error(err)
      }
    }

    fetchPatients()
    fetchAlerts()
    const patientsInterval = setInterval(fetchPatients, 3000)
    const alertsInterval = setInterval(fetchAlerts, 5000)
    return () => {
      clearInterval(patientsInterval)
      clearInterval(alertsInterval)
    }
  }, [staffName, goToLogin])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
    goToLogin()
  }

  const handleAcknowledged = (alertId: number) => setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))

  if (!staffName) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Checking login...</main>
  }

  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader staffName={staffName} onLogout={handleLogout} />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {alerts.length > 0 && (
          <div className="mb-6">
            <AlertPanel alerts={alerts} onAcknowledged={handleAcknowledged} />
          </div>
        )}

        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patients">Patient Monitor</TabsTrigger>
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-4">
            <PatientGrid
              patients={patients}
              loading={patientsLoading}
              error={patientsError}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
            />
            {selectedPatient && (
              <Card>
                <CardHeader>
                  <CardTitle>Real-Time Vitals for {selectedPatient}</CardTitle>
                </CardHeader>
                <CardContent>
                  <VitalsChart patientId={selectedPatient} onUnauthorized={goToLogin} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts ({alerts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <AlertPanel alerts={alerts} onAcknowledged={handleAcknowledged} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Patients with live data</p>
                    <p className="text-2xl font-bold">
                      {patients.filter((p) => p.vitals).length} / {patients.length}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Critical right now</p>
                    <p className="text-2xl font-bold text-destructive">
                      {patients.filter((p) => p.status === "Critical").length}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Unacknowledged alerts</p>
                    <p className="text-2xl font-bold">{alerts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
