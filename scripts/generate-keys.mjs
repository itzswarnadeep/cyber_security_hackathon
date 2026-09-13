// Prints new random secrets for .env.local.
// Careful: new keys can't decrypt data that was stored with the old ones.
import { randomBytes } from "node:crypto"

const key = () => randomBytes(32).toString("base64")

console.log(`ENCRYPTION_KEY=${key()}`)
console.log(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`)
console.log(`DEVICE_KEY_AMB001=${key()}`)
console.log(`DEVICE_KEY_AMB002=${key()}`)
