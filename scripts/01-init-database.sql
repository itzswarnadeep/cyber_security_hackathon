-- Applied by `npm run db:setup`.
-- Vitals and alert messages are stored encrypted (lib/encryption.ts). Only ids, status
-- and timestamps are plain, because the dashboard needs them for sorting and colours.

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INT,
  gender VARCHAR(10),
  medical_conditions VARCHAR(500),
  emergency_contact VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- each ambulance also needs DEVICE_KEY_<ambulance_id> in .env.local
CREATE TABLE IF NOT EXISTS ambulances (
  id SERIAL PRIMARY KEY,
  ambulance_id VARCHAR(50) UNIQUE NOT NULL,
  driver_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vitals (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  ambulance_id VARCHAR(50) NOT NULL REFERENCES ambulances(ambulance_id),
  status VARCHAR(20) NOT NULL,
  encrypted_data TEXT NOT NULL,
  -- ambulance id + IV of the packet. UNIQUE, so a replayed packet can't be stored twice
  transport_nonce VARCHAR(80) UNIQUE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  alert_level VARCHAR(50) NOT NULL,
  encrypted_message TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_time ON vitals(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_open ON alerts(is_acknowledged, created_at DESC);

-- demo data (lib/fleet.ts lists the same ids)
INSERT INTO patients (patient_id, name, age, gender, medical_conditions) VALUES
('PAT001', 'John Doe', 45, 'M', 'Hypertension'),
('PAT002', 'Jane Smith', 52, 'F', 'Diabetes, Heart Disease'),
('PAT003', 'Michael Johnson', 38, 'M', 'Asthma')
ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO ambulances (ambulance_id, driver_name, status) VALUES
('AMB001', 'Officer Mike', 'available'),
('AMB002', 'Officer Sarah', 'available')
ON CONFLICT (ambulance_id) DO NOTHING;
