-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Atlas Cards',
    "vatNumber" TEXT,
    "cashOfferPct" REAL NOT NULL DEFAULT 70,
    "creditOfferPct" REAL NOT NULL DEFAULT 80,
    "allowOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "setNumber" TEXT,
    "rarity" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'NM',
    "purchasePrice" REAL NOT NULL,
    "marketValue" REAL,
    "salePrice" REAL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "paymentType" TEXT,
    "channel" TEXT,
    "notes" TEXT,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
