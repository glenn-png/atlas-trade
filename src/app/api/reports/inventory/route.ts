import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? "IN_STOCK";

  const where =
    statusFilter === "ALL"
      ? {}
      : { status: statusFilter as "IN_STOCK" | "SOLD" | "RESERVED" };

  const cards = await prisma.card.findMany({
    where,
    include: { trade: { select: { number: true } } },
    orderBy: { acquiredAt: "desc" },
  });

  const rows = cards.map((c) => {
    const estimatedMargin =
      c.marketValue ? +(c.marketValue - c.purchasePrice).toFixed(2) : "";
    const marginPct =
      c.marketValue && c.purchasePrice > 0
        ? +((((c.marketValue - c.purchasePrice) / c.purchasePrice) * 100).toFixed(1))
        : "";

    return {
      "Trade #": c.trade?.number ?? "",
      "Card Name": c.name,
      Set: c.set,
      "Set Number": c.setNumber ?? "",
      Rarity: c.rarity ?? "",
      Condition: c.condition,
      "Purchase Price (£)": +c.purchasePrice.toFixed(2),
      "Market Value (£)": c.marketValue ? +c.marketValue.toFixed(2) : "",
      "Est. Margin (£)": estimatedMargin,
      "Margin %": marginPct,
      Status: c.status === "IN_STOCK" ? "In Stock" : c.status === "SOLD" ? "Sold" : "Reserved",
      "Payment Type": c.paymentType === "STORE_CREDIT" ? "Store Credit" : c.paymentType === "CASH" ? "Cash" : "",
      "Acquired Date": c.acquiredAt.toLocaleDateString("en-GB"),
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  // Set column widths
  ws["!cols"] = [
    { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 12 }, { wch: 26 },
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
    { wch: 10 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="atlas-inventory-${dateStr}.xlsx"`,
    },
  });
}
