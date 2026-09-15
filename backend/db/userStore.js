import bcrypt from "bcryptjs";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localStorePath = path.join(__dirname, "local-users.json");
const roles = new Set(["technician", "lab_supervisor", "reviewer", "director", "admin"]);

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, organization: user.organization ?? "", role: user.role, status: user.status, createdAt: user.createdAt ?? user.created_at };
}

function normalizeRow(row) {
  return { id: row.id, name: row.name, email: row.email, organization: row.organization ?? "", passwordHash: row.passwordHash ?? row.password_hash, role: row.role, status: row.status, createdAt: row.createdAt ?? row.created_at };
}

function createSeedAdmin() {
  return {
    id: "USR-ADM-001", name: "System Administrator", email: "admin@legalmetrology.gov.in", organization: "Legal Metrology",
    passwordHash: bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD ?? "R76Secure@2026", 12), role: "admin", status: "active", createdAt: new Date().toISOString(),
  };
}

function createRoleSelectorUsers() {
  return [
    ["technician", "Technician", "USR-LOCAL-TECH"],
    ["lab_supervisor", "Lab Supervisor", "USR-LOCAL-SUP"],
    ["reviewer", "Reviewer", "USR-LOCAL-REV"],
    ["director", "Director", "USR-LOCAL-DIR"],
  ].map(([role, name, id]) => ({
    id, name, email: `${role}@local.certiscale`, organization: "Legal Metrology", passwordHash: bcrypt.hashSync(crypto.randomUUID(), 12), role, status: "active", createdAt: new Date().toISOString(),
  }));
}

export function normalizeRole(role) {
  const value = String(role ?? "").trim().toLowerCase().replace(/[ /-]+/g, "_");
  return roles.has(value) && value !== "admin" ? value : null;
}

export async function createUserStore() {
  if (process.env.DATABASE_URL) {
    try {
      const store = await createPostgresStore(process.env.DATABASE_URL);
      await store.initialize();
      return store;
    } catch (error) {
      console.warn("PostgreSQL user store unavailable, falling back to local store:", error.message);
    }
  }
  const localStore = await createLocalStore();
  await localStore.initialize();
  return localStore;
}

async function createPostgresStore(connectionString) {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  return {
    mode: "PostgreSQL",
    async initialize() {
      await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, organization TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('technician', 'lab_supervisor', 'reviewer', 'director', 'admin')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'deactivated')), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      const admin = createSeedAdmin();
      await pool.query("INSERT INTO users (id,name,email,organization,password_hash,role,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (email) DO NOTHING", [admin.id, admin.name, admin.email, admin.organization, admin.passwordHash, admin.role, admin.status, admin.createdAt]);
    },
    async findByEmail(email) { const result = await pool.query("SELECT * FROM users WHERE lower(email) = lower($1)", [email]); return result.rows[0] ? normalizeRow(result.rows[0]) : null; },
    async findById(id) { const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]); return result.rows[0] ? normalizeRow(result.rows[0]) : null; },
    async findFirstActiveByRole(role) { const result = await pool.query("SELECT * FROM users WHERE role = $1 AND status = 'active' ORDER BY created_at ASC LIMIT 1", [role]); return result.rows[0] ? normalizeRow(result.rows[0]) : null; },
    async createPending({ name, email, organization, passwordHash, role }) {
      const user = { id: `USR-${crypto.randomUUID()}`, name, email, organization, passwordHash, role, status: "pending", createdAt: new Date().toISOString() };
      const result = await pool.query("INSERT INTO users (id,name,email,organization,password_hash,role,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *", [user.id, user.name, user.email, user.organization, user.passwordHash, user.role, user.status, user.createdAt]);
      return publicUser(normalizeRow(result.rows[0]));
    },
    async listPending() { const result = await pool.query("SELECT * FROM users WHERE status = 'pending' ORDER BY created_at ASC"); return result.rows.map((row) => publicUser(normalizeRow(row))); },
    async setStatus(id, status) { const result = await pool.query("UPDATE users SET status = $1 WHERE id = $2 AND status = 'pending' RETURNING *", [status, id]); return result.rows[0] ? publicUser(normalizeRow(result.rows[0])) : null; },
  };
}

async function createLocalStore() {
  async function readUsers() { return existsSync(localStorePath) ? JSON.parse(await readFile(localStorePath, "utf8")) : [createSeedAdmin()]; }
  async function saveUsers(users) { await mkdir(path.dirname(localStorePath), { recursive: true }); await writeFile(localStorePath, `${JSON.stringify(users, null, 2)}\n`, "utf8"); }
  return {
    mode: "local persistent development store",
    async initialize() {
      const users = await readUsers();
      if (!users.some((user) => user.email === "admin@legalmetrology.gov.in")) users.push(createSeedAdmin());
      if (process.env.ROLE_SELECTOR_ENABLED !== "false") {
        for (const user of createRoleSelectorUsers()) if (!users.some((item) => item.role === user.role && item.status === "active")) users.push(user);
      }
      await saveUsers(users);
    },
    async findByEmail(email) { const user = (await readUsers()).find((item) => item.email.toLowerCase() === email.toLowerCase()); return user ? normalizeRow(user) : null; },
    async findById(id) { const user = (await readUsers()).find((item) => item.id === id); return user ? normalizeRow(user) : null; },
    async findFirstActiveByRole(role) { const user = (await readUsers()).find((item) => item.role === role && item.status === "active"); return user ? normalizeRow(user) : null; },
    async createPending({ name, email, organization, passwordHash, role }) { const users = await readUsers(); const user = { id: `USR-${crypto.randomUUID()}`, name, email, organization, passwordHash, role, status: "pending", createdAt: new Date().toISOString() }; users.push(user); await saveUsers(users); return publicUser(user); },
    async listPending() { return (await readUsers()).filter((user) => user.status === "pending").map(publicUser); },
    async setStatus(id, status) { const users = await readUsers(); const user = users.find((item) => item.id === id && item.status === "pending"); if (!user) return null; user.status = status; await saveUsers(users); return publicUser(user); },
  };
}
