/**
 * Creates all SQLite tables if they don't already exist.
 * Safe to run on every deploy — uses CREATE TABLE IF NOT EXISTS.
 * Seeds the first admin user from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * env vars if no users exist yet.
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const dbPath = process.env.DATABASE_PATH ?? path.resolve(process.cwd(), "prisma/dev.db");
console.log(`[init-db] DATABASE_PATH env: ${process.env.DATABASE_PATH ?? "(not set, using default)"}`);

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`[init-db] Using database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'STAFF',
    active       INTEGER NOT NULL DEFAULT 1,
    createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS GradingSubmission (
    id          TEXT PRIMARY KEY,
    company     TEXT NOT NULL,
    reference   TEXT,
    status      TEXT NOT NULL DEFAULT 'SUBMITTED',
    notes       TEXT,
    submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    returnedAt  DATETIME
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

// Migrate: add new Card columns if they don't exist yet
const cardCols = db.pragma("table_info(Card)").map((c) => c.name);
if (!cardCols.includes("itemType"))
  db.exec("ALTER TABLE Card ADD COLUMN itemType TEXT NOT NULL DEFAULT 'SINGLE'");
if (!cardCols.includes("quantity"))
  db.exec("ALTER TABLE Card ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1");
if (!cardCols.includes("grade"))
  db.exec("ALTER TABLE Card ADD COLUMN grade TEXT");
if (!cardCols.includes("gradeWorthy"))
  db.exec("ALTER TABLE Card ADD COLUMN gradeWorthy INTEGER NOT NULL DEFAULT 0");
if (!cardCols.includes("gradingSubmissionId"))
  db.exec("ALTER TABLE Card ADD COLUMN gradingSubmissionId TEXT REFERENCES GradingSubmission(id)");
if (!cardCols.includes("gradingCost"))
  db.exec("ALTER TABLE Card ADD COLUMN gradingCost REAL");
if (!cardCols.includes("gradedAt"))
  db.exec("ALTER TABLE Card ADD COLUMN gradedAt DATETIME");

// Seed first admin if no users exist
const userCount = db.prepare("SELECT COUNT(*) as count FROM User").get();
if (userCount.count === 0) {
  const email = process.env.SEED_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;

  if (email && password) {
    const passwordHash = bcrypt.hashSync(password, 12);
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    db.prepare(
      "INSERT INTO User (id, name, email, passwordHash, role) VALUES (?, ?, ?, ?, ?)"
    ).run(id, "Admin", email, passwordHash, "ADMIN");
    console.log(`[init-db] Created admin user: ${email}`);
  } else {
    console.warn("[init-db] No SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD set — no admin user created.");
  }
}

db.close();
console.log("[init-db] Database ready.");
