import { neon } from "@neondatabase/serverless"
import type { PatientStatus } from "./types"

let sql: ReturnType<typeof neon> | null = null

function db() {
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

export interface PatientRow {
  patient_id: string
  name: string
  age: number | null
  medical_conditions: string | null
}

export interface PatientWithLatestVital extends PatientRow {
  ambulance_id: string | null
  status: PatientStatus | null
  encrypted_data: string | null
  recorded_at: string | null
}

export interface VitalRow {
  id: number
  status: PatientStatus
  encrypted_data: string
  recorded_at: string
}

export interface AlertRow {
  id: number
  patient_id: string
  alert_level: string
  encrypted_message: string
  created_at: string
}

// 23505 = unique_violation, which here means the same packet came in twice
export function isDuplicate(error: unknown) {
  return (error as { code?: string } | null)?.code === "23505"
}

export async function ping() {
  await db()`SELECT 1`
}

export async function getPatient(patientId: string) {
  const rows = (await db()`
    SELECT patient_id, name, age, medical_conditions FROM patients WHERE patient_id = ${patientId}`) as PatientRow[]
  return rows[0] ?? null
}

export async function storeVitals(v: {
  patientId: string
  ambulanceId: string
  status: PatientStatus
  encryptedData: string
  nonce: string
}) {
  const rows = (await db()`
    INSERT INTO vitals (patient_id, ambulance_id, status, encrypted_data, transport_nonce)
    VALUES (${v.patientId}, ${v.ambulanceId}, ${v.status}, ${v.encryptedData}, ${v.nonce})
    RETURNING id`) as { id: number }[]
  return rows[0].id
}

// newest `limit` readings from the last `minutes`, returned oldest first for the chart
export async function getRecentVitals(patientId: string, minutes: number, limit: number) {
  const rows = (await db()`
    SELECT id, status, encrypted_data, recorded_at FROM vitals
    WHERE patient_id = ${patientId}
      AND recorded_at > NOW() - ${minutes}::int * INTERVAL '1 minute'
    ORDER BY recorded_at DESC
    LIMIT ${limit}`) as VitalRow[]
  return rows.reverse()
}

export async function getPatientsWithLatestVital() {
  return (await db()`
    SELECT p.patient_id, p.name, p.age, p.medical_conditions,
           v.ambulance_id, v.status, v.encrypted_data, v.recorded_at
    FROM patients p
    LEFT JOIN LATERAL (
      SELECT * FROM vitals WHERE patient_id = p.patient_id ORDER BY recorded_at DESC LIMIT 1
    ) v ON true
    ORDER BY p.patient_id`) as PatientWithLatestVital[]
}

export async function createAlert(patientId: string, encryptedMessage: string) {
  await db()`
    INSERT INTO alerts (patient_id, alert_type, alert_level, encrypted_message)
    VALUES (${patientId}, 'CRITICAL_VITALS', 'CRITICAL', ${encryptedMessage})`
}

export async function getActiveAlerts() {
  return (await db()`
    SELECT id, patient_id, alert_level, encrypted_message, created_at
    FROM alerts WHERE is_acknowledged = FALSE
    ORDER BY created_at DESC LIMIT 50`) as AlertRow[]
}

export async function acknowledgeAlert(alertId: number, staffName: string) {
  const rows = await db()`
    UPDATE alerts SET is_acknowledged = TRUE, acknowledged_by = ${staffName}, acknowledged_at = NOW()
    WHERE id = ${alertId} AND is_acknowledged = FALSE
    RETURNING id`
  return (rows as unknown[]).length > 0
}
