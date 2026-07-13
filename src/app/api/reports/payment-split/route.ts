import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
      },
    } : {}),
  };

  const trades = await prisma.trade.findMany({
    where,
    include: { cards: { select: { purchasePrice: true } } },
    orderBy: { number: "asc" },
  });

  const cashTrades = trades.filter((t) => t.paymentType === "CASH");
  const creditTrades = trades.filter((t) => t.paymentType === "STORE_CREDIT");
  const cashTotal = cashTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0), 0);
  const creditTotal = creditTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0), 0);
  const grandTotal = cashTotal + creditTotal;

  const summaryRows = [
    { "Payment Type": "Cash", "Trades": cashTrades.length, "Cards": cashTrades.reduce((s, t) => s + t.cards.length, 0), "Total Paid Out (£)": +cashTotal.toFixed(2), "% of Total": grandTotal > 0 ? +((cashTotal / grandTotal) * 100).toFixed(1) : 0 },
    { "Payment Type": "Store Credit", "Trades": creditTrades.length, "Cards": creditTrades.reduce((s, t) => s + t.cards.length, 0), "Total Paid Out (£)": +creditTotal.toFixed(2), "% of Total": grandTotal > 0 ? +((creditTotal / grandTotal) * 100).toFixed(1) : 0 },
    { "Payment Type": "TOTAL", "Trades": trades.length, "Cards": trades.reduce((s, t) => s + t.cards.length, 0), "Total Paid Out (£)": +grandTotal.toFixed(2), "% of Total": 100 },
  ];

  const tradeRows = trades.map((t) => {
    const cost = t.cards.reduce((s, c) => s + c.purchasePrice, 0);
    return {
      "Trade #": t.number,
      "Date": t.createdAt.toLocaleDateString("en-GB"),
      "Payment Type": t.paymentType === "STORE_CREDIT" ? "Store Credit" : "Purchase",
      "Cards": t.cards.length,
      "Total Paid Out (£)": +cost.toFixed(2),
    };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tradeRows), "All Trades");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="atlas-payment-split-${dateStr}.xlsx"`,
    },
  });
}
