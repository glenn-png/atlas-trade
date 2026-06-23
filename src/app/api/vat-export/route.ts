import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getQuarter(date: Date) {
  return Math.floor(date.getMonth() / 3);
}

function quarterLabel(year: number, q: number) {
  return `Q${q + 1} ${year}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";

  const [allCards, allSalesDays] = await Promise.all([
    prisma.card.findMany({
      select: { purchasePrice: true, acquiredAt: true },
    }),
    prisma.salesDay.findMany({
      orderBy: { date: "desc" },
    }),
  ]);

  // Build quarterly totals
  const quarters: Record<string, { purchases: number; sales: number; year: number; q: number }> = {};

  for (const card of allCards) {
    const d = card.acquiredAt;
    const y = d.getFullYear();
    const q = getQuarter(d);
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

  const rows = Object.entries(quarters)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, data]) => {
      const margin = data.sales - data.purchases;
      const vat = margin > 0 ? margin / 6 : 0;
      return {
        "Quarter": quarterLabel(data.year, data.q),
        "Total Purchases (£)": data.purchases.toFixed(2),
        "Total Sales (£)": data.sales.toFixed(2),
        "Margin (£)": margin.toFixed(2),
        "VAT Due (£)": vat.toFixed(2),
      };
    });

  if (format === "csv") {
    if (rows.length === 0) {
      return new NextResponse("No data", { status: 404 });
    }
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String(r[h as keyof typeof r] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    return new NextResponse(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="atlas-vat-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json(rows);
}
