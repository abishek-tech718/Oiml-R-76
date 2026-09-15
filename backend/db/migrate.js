import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and set the PostgreSQL connection string.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function runMigration() {
  const [schema, toleranceRules, applicabilityRules, environmentalLimits] = await Promise.all([
    readFile(path.join(__dirname, "schema.sql"), "utf8"),
    readFile(path.join(__dirname, "seed_tolerance_rules.sql"), "utf8"),
    readFile(path.join(__dirname, "seed_test_applicability_rules.sql"), "utf8"),
    readFile(path.join(__dirname, "seed_environmental_limits.sql"), "utf8"),
  ]);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(schema);
    await client.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS applicable_test_types JSONB NOT NULL DEFAULT '[]'::jsonb");
    await client.query(toleranceRules);
    await client.query(applicabilityRules);
    await client.query(environmentalLimits);
    const passwordHash = bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD ?? "R76Secure@2026", 12);
    await client.query(
      `INSERT INTO users (id, name, email, organization, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'admin', 'active')
       ON CONFLICT (email) DO NOTHING`,
      ["USR-ADM-001", "System Administrator", "admin@legalmetrology.gov.in", "Legal Metrology", passwordHash],
    );
    await client.query("COMMIT");
    console.log("Database schema and reference rules are ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error(`Database migration failed: ${error.message}`);
  process.exitCode = 1;
});
