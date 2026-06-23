import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function getQuarter(date: Date) {
  return Math.floor(date.getMonth() / 3);
}

function quarterLabel(year: number, q: number) {
  return `Q${q + 1} ${year}`;
}

function quarterDates(year: number, q: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = q * 3;
  return `${months[s]} – ${months[s + 2]} ${year}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateWhere = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
  };

  const [allCards, allSalesDays] = await Promise.all([
    prisma.card.findMany({
      select: { purchasePrice: true, acquiredAt: true },
      where: Object.keys(dateWhere).length ? { acquiredAt: dateWhere } : undefined,
    }),
    prisma.salesDay.findMany({
      where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined,
      orderBy: { date: "asc" },
    }),
  ]);

  // Build quarterly totals
  const quarters: Record<string, { purchases: number; sales: number; year: number; q: number }> = {};
  for (const card of allCards) {
    const y = card.acquiredAt.getFullYear();
    const q = getQuarter(card.acquiredAt);
    const key = `${y}-${q}`;
    if (!quarters[key]) quarters[key] = { purchases: 0, sales: 0, year: y, q };
    quarters[key].purchases += card.purchasePrice;
  }
  for (const sd of allSalesDays) {
    const d = new Date(sd.date);
    const y = d.getFullYear();
    const q = getQuarter(d);
    const key = `${y}-${q}`;
    if (!quarters[key]) quarters[key] = { purchases: 0, sales: 0, year: y, q };
    quarters[key].sales += sd.msSinglesTotal;
  }

  // Sheet 1: Quarterly summary
  const quarterlySummary = Object.entries(quarters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, d]) => {
      const margin = d.sales - d.purchases;
      const vat = margin > 0 ? margin / 6 : 0;
      return {
        Quarter: quarterLabel(d.year, d.q),
        Period: quarterDates(d.year, d.q),
        "Total Purchases (£)": +d.purchases.toFixed(2),
        "Total Sales (£)": +d.sales.toFixed(2),
        "Margin (£)": +margin.toFixed(2),
        "VAT Due (£)": +vat.toFixed(2),
      };
    });

  // Sheet 2: Daily sales log
  const salesLog = allSalesDays.map((sd) => ({
    Date: new Date(sd.date).toLocaleDateString("en-GB"),
    "MS-Singles Total (£)": +sd.msSinglesTotal.toFixed(2),
    Source: sd.source,
    "Synced At": new Date(sd.syncedAt).toLocaleDateString("en-GB"),
  }));

  // Sheet 3: Purchase log
  const purchaseLog = allCards.map((c) => ({
    Date: c.acquiredAt.toLocaleDateString("en-GB"),
    "Purchase Cost (£)": +c.purchasePrice.toFixed(2),
    Quarter: quarterLabel(c.acquiredAt.getFullYear(), getQuarter(c.acquiredAt)),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quarterlySummary), "VAT Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesLog.length ? salesLog : [{ Note: "No sales data" }]), "Sales Log");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseLog), "Purchase Log");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="atlas-vat-${dateStr}.xlsx"`,
    },
  });
}
