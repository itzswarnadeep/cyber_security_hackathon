import type { VitalReadings } from "./classification"

export type PatientStatus = "Critical" | "Moderate" | "Stable"

// plaintext packet, only ever exists on the ambulance device and inside the server
export interface VitalsPacket extends VitalReadings {
  patientId: string
  ts: number
}

// what goes over the wire
export interface SealedEnvelope {
  ambulanceId: string
  iv: string
  ciphertext: string
}

export interface StoredVitals extends VitalReadings {
  deviceTimestamp: number
}
