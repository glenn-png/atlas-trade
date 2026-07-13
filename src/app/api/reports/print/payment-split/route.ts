import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { printHtml, gbp } from "@/lib/printHtml";

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
  const cashCards = cashTrades.reduce((s, t) => s + t.cards.length, 0);
  const creditCards = creditTrades.reduce((s, t) => s + t.cards.length, 0);

  const periodLabel = from && to
    ? `${new Date(from).toLocaleDateString("en-GB")} – ${new Date(to).toLocaleDateString("en-GB")}`
    : "All time";

  const summaryGrid = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-label">Total Trades</div><div class="summary-value">${trades.length}</div></div>
      <div class="summary-cell"><div class="summary-label">Total Paid Out</div><div class="summary-value">${gbp(grandTotal)}</div></div>
      <div class="summary-cell"><div class="summary-label">Purchase Trades</div><div class="summary-value">${cashTrades.length}</div></div>
      <div class="summary-cell"><div class="summary-label">Credit Trades</div><div class="summary-value">${creditTrades.length}</div></div>
    </div>`;

  const splitTable = `
    <h2>Payment Split Summary</h2>
    <table>
      <thead><tr><th>Payment Type</th><th>Trades</th><th>Cards</th><th class="right">Total Paid Out</th><th class="right">% of Total</th></tr></thead>
      <tbody>
        <tr>
          <td><span class="badge badge-green">Purchase</span></td>
          <td>${cashTrades.length}</td>
          <td>${cashCards}</td>
          <td class="right mono">${gbp(cashTotal)}</td>
          <td class="right">${grandTotal > 0 ? ((cashTotal / grandTotal) * 100).toFixed(1) : 0}%</td>
        </tr>
        <tr>
          <td><span class="badge badge-blue">Store Credit</span></td>
          <td>${creditTrades.length}</td>
          <td>${creditCards}</td>
          <td class="right mono">${gbp(creditTotal)}</td>
          <td class="right">${grandTotal > 0 ? ((creditTotal / grandTotal) * 100).toFixed(1) : 0}%</td>
        </tr>
      </tbody>
      <tfoot><tr><td><strong>Total</strong></td><td><strong>${trades.length}</strong></td><td><strong>${cashCards + creditCards}</strong></td><td class="right mono"><strong>${gbp(grandTotal)}</strong></td><td class="right">100%</td></tr></tfoot>
    </table>`;

  const tradeRows = trades.map((t) => {
    const cost = t.cards.reduce((s, c) => s + c.purchasePrice, 0);
    const badge = t.paymentType === "CASH"
      ? `<span class="badge badge-green">Purchase</span>`
      : `<span class="badge badge-blue">Store Credit</span>`;
    return `<tr>
      <td><strong>#${t.number}</strong></td>
      <td>${t.createdAt.toLocaleDateString("en-GB")}</td>
      <td>${badge}</td>
      <td>${t.cards.length}</td>
      <td class="right mono">${gbp(cost)}</td>
    </tr>`;
  }).join("");

  const tradeTable = `
    <h2>All Trades</h2>
    <table>
      <thead><tr><th>Trade #</th><th>Date</th><th>Payment</th><th>Cards</th><th class="right">Paid Out</th></tr></thead>
      <tbody>${tradeRows}</tbody>
    </table>`;

  const html = printHtml("Purchase vs Credit Report", periodLabel, summaryGrid + splitTable + tradeTable);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
