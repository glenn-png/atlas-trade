import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const cards = [
  // Sold cards (recent)
  { name: "Umbreon VMAX", set: "Evolving Skies", setNumber: "215/203", rarity: "Alt Art", condition: "NM", purchasePrice: 168, marketValue: 240, salePrice: 245, status: "SOLD", channel: "IN_STORE", soldAt: new Date("2026-06-22"), paymentType: "CASH" },
  { name: "Lugia V", set: "Silver Tempest", setNumber: "186/195", rarity: "Alt Art", condition: "NM", purchasePrice: 52.5, marketValue: 75, salePrice: 75, status: "SOLD", channel: "EBAY", soldAt: new Date("2026-06-21"), paymentType: "CASH" },
  { name: "Giratina VSTAR", set: "Lost Origin", setNumber: "196/196", rarity: "Alt Art", condition: "LP", purchasePrice: 91, marketValue: 130, salePrice: 125, status: "SOLD", channel: "EBAY", soldAt: new Date("2026-06-20"), paymentType: "CASH" },
  { name: "Comfey", set: "Lost Origin", setNumber: "79/196", rarity: "Uncommon", condition: "NM", purchasePrice: 3.5, marketValue: 6, salePrice: 5.5, status: "SOLD", channel: "IN_STORE", soldAt: new Date("2026-06-20"), paymentType: "CASH" },
  { name: "Blaziken VMAX", set: "Chilling Reign", setNumber: "200/198", rarity: "Alt Art", condition: "NM", purchasePrice: 56, marketValue: 85, salePrice: 82, status: "SOLD", channel: "WEBSITE", soldAt: new Date("2026-06-19"), paymentType: "CASH" },
  { name: "Rayquaza VMAX", set: "Evolving Skies", setNumber: "218/203", rarity: "Alt Art", condition: "NM", purchasePrice: 112, marketValue: 160, salePrice: 158, status: "SOLD", channel: "EBAY", soldAt: new Date("2026-06-18"), paymentType: "CASH" },
  // May sales
  { name: "Pikachu VMAX", set: "Vivid Voltage", setNumber: "188/185", rarity: "Rainbow Rare", condition: "NM", purchasePrice: 42, marketValue: 65, salePrice: 63, status: "SOLD", channel: "IN_STORE", soldAt: new Date("2026-05-28"), paymentType: "CASH" },
  { name: "Charizard V", set: "Brilliant Stars", setNumber: "154/172", rarity: "Full Art", condition: "NM", purchasePrice: 35, marketValue: 55, salePrice: 52, status: "SOLD", channel: "EBAY", soldAt: new Date("2026-05-15"), paymentType: "STORE_CREDIT" },
  { name: "Mewtwo V", set: "Pokemon GO", setNumber: "72/78", rarity: "Full Art", condition: "NM", purchasePrice: 28, marketValue: 42, salePrice: 40, status: "SOLD", channel: "EBAY", soldAt: new Date("2026-05-10"), paymentType: "CASH" },
  // Q1 sales
  { name: "Mew VMAX", set: "Fusion Strike", setNumber: "114/264", rarity: "Alt Art", condition: "NM", purchasePrice: 84, marketValue: 130, salePrice: 128, status: "SOLD", channel: "EBAY", soldAt: new Date("2026-03-22"), paymentType: "CASH" },
  { name: "Sylveon VMAX", set: "Evolving Skies", setNumber: "212/203", rarity: "Alt Art", condition: "NM", purchasePrice: 63, marketValue: 95, salePrice: 92, status: "SOLD", channel: "IN_STORE", soldAt: new Date("2026-02-14"), paymentType: "CASH" },

  // In-stock cards (recent trade-ins)
  { name: "Charizard ex", set: "Obsidian Flames", setNumber: "215/197", rarity: "Special Illustration Rare", condition: "NM", purchasePrice: 84, marketValue: 120, status: "IN_STOCK", paymentType: "STORE_CREDIT" },
  { name: "Pikachu VMAX", set: "Vivid Voltage", setNumber: "044/185", rarity: "Rainbow Rare", condition: "LP", purchasePrice: 31.5, marketValue: 45, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Mew ex", set: "151", setNumber: "205/165", rarity: "Special Illustration Rare", condition: "NM", purchasePrice: 22.4, marketValue: 32, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Rayquaza VMAX", set: "Evolving Skies", setNumber: "217/203", rarity: "Alt Art", condition: "LP", purchasePrice: 84, marketValue: 110, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Eevee VMAX", set: "Evolving Skies", setNumber: "207/203", rarity: "Alt Art", condition: "NM", purchasePrice: 45, marketValue: 68, status: "IN_STOCK", paymentType: "STORE_CREDIT" },
  { name: "Glaceon VMAX", set: "Evolving Skies", setNumber: "209/203", rarity: "Alt Art", condition: "NM", purchasePrice: 38, marketValue: 55, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Leafeon VMAX", set: "Evolving Skies", setNumber: "210/203", rarity: "Alt Art", condition: "LP", purchasePrice: 29, marketValue: 40, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Palkia VSTAR", set: "Astral Radiance", setNumber: "186/189", rarity: "Alt Art", condition: "NM", purchasePrice: 49, marketValue: 70, status: "IN_STOCK", paymentType: "STORE_CREDIT" },
  { name: "Dialga VSTAR", set: "Astral Radiance", setNumber: "185/189", rarity: "Alt Art", condition: "NM", purchasePrice: 38, marketValue: 54, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Darkrai VSTAR", set: "Astral Radiance", setNumber: "189/189", rarity: "Alt Art", condition: "NM", purchasePrice: 56, marketValue: 80, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Kyogre", set: "Celebrations", setNumber: "3/25", rarity: "Classic Collection", condition: "NM", purchasePrice: 14, marketValue: 22, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Groudon", set: "Celebrations", setNumber: "2/25", rarity: "Classic Collection", condition: "NM", purchasePrice: 12, marketValue: 18, status: "IN_STOCK", paymentType: "CASH" },
  { name: "Gardevoir ex", set: "Scarlet & Violet", setNumber: "230/198", rarity: "Special Illustration Rare", condition: "NM", purchasePrice: 56, marketValue: 82, status: "IN_STOCK", paymentType: "CASH" },
];

async function main() {
  console.log("Seeding database…");

  // Upsert store
  await prisma.store.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "Atlas Cards", cashOfferPct: 70, creditOfferPct: 80, allowOverride: true },
  });

  // Clear existing cards
  await prisma.card.deleteMany();

  for (const card of cards) {
    await prisma.card.create({
      data: {
        name: card.name,
        set: card.set,
        setNumber: card.setNumber ?? null,
        rarity: card.rarity ?? null,
        condition: card.condition as "NM" | "LP" | "MP" | "HP",
        purchasePrice: card.purchasePrice,
        marketValue: card.marketValue ?? null,
        salePrice: card.salePrice ?? null,
        status: card.status as "IN_STOCK" | "SOLD",
        channel: (card.channel as "IN_STORE" | "EBAY" | "WEBSITE" | "OTHER") ?? null,
        paymentType: (card.paymentType as "CASH" | "STORE_CREDIT") ?? null,
        soldAt: card.soldAt ?? null,
        acquiredAt: card.soldAt
          ? new Date(card.soldAt.getTime() - 14 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`Seeded ${cards.length} cards.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
