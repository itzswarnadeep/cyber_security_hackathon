"use client"

import { Activity, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardHeader({ staffName, onLogout }: { staffName: string; onLogout: () => void }) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">MEDCARE24</h1>
            <p className="text-sm text-muted-foreground">Hospital dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{staffName}</span>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}
