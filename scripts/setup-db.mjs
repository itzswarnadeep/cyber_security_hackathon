// npm run db:setup   create tables + demo data (safe to re-run)
// npm run db:reset   drop everything first
import { readFileSync } from "node:fs"
import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is empty in .env.local")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

if (process.argv.includes("--reset")) {
  await sql.query("DROP TABLE IF EXISTS alerts, vitals, ambulances, patients CASCADE")
  console.log("old tables dropped")
}

// neon's http driver runs one statement per query, so split the file
const statements = readFileSync(new URL("./01-init-database.sql", import.meta.url), "utf8")
  .replace(/^--.*$/gm, "")
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean)

for (const statement of statements) {
  await sql.query(statement)
}

console.log(`done, ${statements.length} statements`)
