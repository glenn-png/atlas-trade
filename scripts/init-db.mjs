/**
 * Creates all SQLite tables if they don't already exist.
 * Safe to run on every deploy — uses CREATE TABLE IF NOT EXISTS.
 * Run before `next start` via the Railway start command.
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH ?? path.resolve(process.cwd(), "prisma/dev.db");
console.log(`[init-db] DATABASE_PATH env: ${process.env.DATABASE_PATH ?? "(not set, using default)"}`)

// Ensure the directory exists (important for /data volume on Railway)
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`[init-db] Using database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS Store (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL DEFAULT 'Atlas Cards',
    vatNumber      TEXT,
    cashOfferPct   REAL NOT NULL DEFAULT 70,
    creditOfferPct REAL NOT NULL DEFAULT 80,
    allowOverride  INTEGER NOT NULL DEFAULT 1,
    createdAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Trade (
    id          TEXT PRIMARY KEY,
    number      INTEGER NOT NULL,
    paymentType TEXT NOT NULL,
    notes       TEXT,
    createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Card (
    id            TEXT PRIMARY KEY,
    tradeId       TEXT REFERENCES Trade(id),
    name          TEXT NOT NULL,
    "set"         TEXT NOT NULL,
    setNumber     TEXT,
    rarity        TEXT,
    condition     TEXT NOT NULL DEFAULT 'NM',
    purchasePrice REAL NOT NULL,
    marketValue   REAL,
    salePrice     REAL,
    status        TEXT NOT NULL DEFAULT 'IN_STOCK',
    paymentType   TEXT,
    channel       TEXT,
    notes         TEXT,
    acquiredAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    soldAt        DATETIME,
    createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS SumupCredential (
    id           TEXT PRIMARY KEY DEFAULT 'default',
    merchantCode TEXT NOT NULL,
    refreshToken TEXT NOT NULL,
    connectedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS SalesDay (
    id               TEXT PRIMARY KEY,
    date             DATETIME NOT NULL UNIQUE,
    msSinglesTotal   REAL NOT NULL,
    transactionCount INTEGER NOT NULL DEFAULT 0,
    source           TEXT NOT NULL DEFAULT 'SUMUP',
    syncedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

db.close();
console.log("[init-db] Database ready.");
