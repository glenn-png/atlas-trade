import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const trades = await prisma.trade.findMany({
    where,
    include: { cards: true },
    orderBy: { number: "asc" },
  });

  // Sheet 1: Trade summary
  const summaryRows = trades.map((t) => {
    const totalCost = t.cards.reduce((s, c) => s + c.purchasePrice, 0);
    const totalMarket = t.cards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
    return {
      "Trade #": t.number,
      Date: t.createdAt.toLocaleDateString("en-GB"),
      Time: t.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      "Payment Type": t.paymentType === "STORE_CREDIT" ? "Store Credit" : "Purchase",
      Cards: t.cards.length,
      "Total Cost (£)": +totalCost.toFixed(2),
      "Total Market Value (£)": totalMarket > 0 ? +totalMarket.toFixed(2) : "",
      "Est. Margin (£)": totalMarket > 0 ? +(totalMarket - totalCost).toFixed(2) : "",
    };
  });

  // Sheet 2: Individual cards
  const cardRows = trades.flatMap((t) =>
    t.cards.map((c) => ({
      "Trade #": t.number,
      Date: t.createdAt.toLocaleDateString("en-GB"),
      "Card Name": c.name,
      Set: c.set,
      "Set Number": c.setNumber ?? "",
      Rarity: c.rarity ?? "",
      Condition: c.condition,
      "Purchase Price (£)": +c.purchasePrice.toFixed(2),
      "Market Value (£)": c.marketValue ? +c.marketValue.toFixed(2) : "",
      "Payment Type": t.paymentType === "STORE_CREDIT" ? "Store Credit" : "Purchase",
      Status: c.status === "IN_STOCK" ? "In Stock" : c.status === "SOLD" ? "Sold" : "Reserved",
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Trade Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cardRows), "Cards");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="atlas-trades-${dateStr}.xlsx"`,
    },
  });
}
