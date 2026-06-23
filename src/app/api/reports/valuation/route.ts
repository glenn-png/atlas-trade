import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const cards = await prisma.card.findMany({
    where: { status: "IN_STOCK" },
    include: { trade: { select: { number: true, createdAt: true } } },
    orderBy: { acquiredAt: "desc" },
  });

  const totalCost = cards.reduce((s, c) => s + c.purchasePrice, 0);
  const totalMarket = cards.reduce((s, c) => s + (c.marketValue ?? c.purchasePrice), 0);

  // Summary row first
  const summaryRows = [
    { Metric: "Cards in Stock", Value: cards.length },
    { Metric: "Total Cost Value (£)", Value: +totalCost.toFixed(2) },
    { Metric: "Total Market Value (£)", Value: +totalMarket.toFixed(2) },
    { Metric: "Unrealised Gain (£)", Value: +(totalMarket - totalCost).toFixed(2) },
    { Metric: "Avg Cost Per Card (£)", Value: cards.length > 0 ? +(totalCost / cards.length).toFixed(2) : 0 },
    { Metric: "Report Date", Value: new Date().toLocaleDateString("en-GB") },
  ];

  const cardRows = cards.map((c) => ({
    "Trade #": c.trade?.number ?? "",
    "Card Name": c.name,
    Set: c.set,
    "Set Number": c.setNumber ?? "",
    Rarity: c.rarity ?? "",
    Condition: c.condition,
    "Cost (£)": +c.purchasePrice.toFixed(2),
    "Market Value (£)": c.marketValue ? +c.marketValue.toFixed(2) : +c.purchasePrice.toFixed(2),
    "Gain (£)": c.marketValue ? +(c.marketValue - c.purchasePrice).toFixed(2) : 0,
    "Gain %": c.marketValue && c.purchasePrice > 0
      ? +((((c.marketValue - c.purchasePrice) / c.purchasePrice) * 100).toFixed(1))
      : 0,
    "Acquired": c.acquiredAt.toLocaleDateString("en-GB"),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  const ws = XLSX.utils.json_to_sheet(cardRows);
  ws["!cols"] = [
    { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 12 }, { wch: 26 },
    { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Stock Detail");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="atlas-valuation-${dateStr}.xlsx"`,
    },
  });
}
