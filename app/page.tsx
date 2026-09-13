import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Radio, Lock, AlertCircle, BarChart3 } from "lucide-react"

const features = [
  {
    icon: Lock,
    title: "Encrypted in the ambulance",
    text: "Each ambulance seals readings with its own AES-256-GCM key. Changed, forged or replayed packets are rejected.",
  },
  {
    icon: Activity,
    title: "Live monitoring",
    text: "The hospital sees every patient's latest vitals and trend while the ambulance is still on the way.",
  },
  {
    icon: AlertCircle,
    title: "Triage and alerts",
    text: "Every reading is classified Critical, Moderate or Stable. Critical ones raise an alert until a doctor acknowledges it.",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-lg">
              <Activity className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <p className="text-primary font-semibold tracking-wide mb-2">MEDCARE24</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Secure Real-Time Ambulance Data Transmission
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Vitals go from the ambulance to the hospital in real time, so the emergency team is ready before the patient
            arrives, and nobody in between can read or change them.
          </p>
          <p className="text-sm text-muted-foreground">
            Team SAHARA, Hackathon for Cyber Security 2025, winner of the Healthcare track
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="border-2">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Radio className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Ambulance Simulator</CardTitle>
              <CardDescription>Ambulance side</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Send vitals automatically or by hand, then try to attack the transmission in the Security Lab.
              </p>
              <Link href="/simulator">
                <Button className="w-full">Open simulator</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Hospital Dashboard</CardTitle>
              <CardDescription>Hospital side, staff login</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Live patient cards, vitals chart per patient, and critical alerts to acknowledge.
              </p>
              <Link href="/dashboard">
                <Button className="w-full">Open dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
