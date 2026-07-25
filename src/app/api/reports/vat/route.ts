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

  const cards = await prisma.card.findMany({
    select: {
      name: true,
      set: true,
      setNumber: true,
      itemType: true,
      purchasePrice: true,
      marketValue: true,
      paymentType: true,
      status: true,
      acquiredAt: true,
    },
    where: {
      marketValue: { not: null },
      ...(Object.keys(dateWhere).length ? { acquiredAt: dateWhere } : {}),
    },
    orderBy: { acquiredAt: "asc" },
  });

  // Build quarterly buckets
  type QData = { purchases: number; market: number; year: number; q: number };
  const quarters: Record<string, QData> = {};
  for (const card of cards) {
    if (card.marketValue == null) continue;
    const y = card.acquiredAt.getFullYear();
    const q = getQuarter(card.acquiredAt);
    const key = `${y}-${q}`;
    if (!quarters[key]) quarters[key] = { purchases: 0, market: 0, year: y, q };
    quarters[key].purchases += card.purchasePrice;
    quarters[key].market += card.marketValue;
  }

  // Sheet 1: Quarterly summary
  const quarterlySummary = Object.entries(quarters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, d]) => {
      const margin = d.market - d.purchases;
      const vat = margin > 0 ? margin / 6 : 0;
      return {
        Quarter: quarterLabel(d.year, d.q),
        Period: quarterDates(d.year, d.q),
        "Cards": cards.filter(c => c.acquiredAt.getFullYear() === d.year && getQuarter(c.acquiredAt) === d.q && c.marketValue != null).length,
        "Total Paid (£)": +d.purchases.toFixed(2),
        "Market Value (£)": +d.market.toFixed(2),
        "Margin (£)": +margin.toFixed(2),
        "Est. VAT (£)": +vat.toFixed(2),
      };
    });

  // Sheet 2: Card ledger
  const cardLedger = cards
    .filter(c => c.marketValue != null)
    .map(c => {
      const margin = c.marketValue! - c.purchasePrice;
      const vat = margin > 0 ? margin / 6 : 0;
      return {
        Card: c.name,
        Set: c.set,
        "Set #": c.setNumber ?? "",
        Type: c.itemType,
        Acquired: c.acquiredAt.toLocaleDateString("en-GB"),
        Quarter: quarterLabel(c.acquiredAt.getFullYear(), getQuarter(c.acquiredAt)),
        Payment: c.paymentType === "PURCHASE" ? "Purchase" : c.paymentType === "STORE_CREDIT" ? "Store Credit" : "",
        Status: c.status,
        "Buy Price (£)": +c.purchasePrice.toFixed(2),
        "Market Value (£)": +c.marketValue!.toFixed(2),
        "Margin (£)": +margin.toFixed(2),
        "Est. VAT (£)": +vat.toFixed(2),
      };
    });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quarterlySummary), "VAT Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cardLedger.length ? cardLedger : [{ Note: "No cards with market values" }]), "Card Ledger");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="atlas-vat-${dateStr}.xlsx"`,
    },
  });
}
