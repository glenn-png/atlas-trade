import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { printHtml, gbp } from "@/lib/printHtml";

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
    include: { cards: { orderBy: { createdAt: "asc" } } },
    orderBy: { number: "asc" },
  });

  const totalCards = trades.reduce((s, t) => s + t.cards.length, 0);
  const totalCost = trades.reduce(
    (s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0),
    0
  );

  const periodLabel =
    from && to
      ? `${new Date(from).toLocaleDateString("en-GB")} – ${new Date(to).toLocaleDateString("en-GB")}`
      : "All time";

  const summaryRow = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-label">Trades</div><div class="summary-value">${trades.length}</div></div>
      <div class="summary-cell"><div class="summary-label">Cards</div><div class="summary-value">${totalCards}</div></div>
      <div class="summary-cell"><div class="summary-label">Total Cost</div><div class="summary-value">${gbp(totalCost)}</div></div>
      <div class="summary-cell"><div class="summary-label">Avg per Trade</div><div class="summary-value">${trades.length > 0 ? gbp(totalCost / trades.length) : "—"}</div></div>
    </div>`;

  const tradeRows = trades
    .map((t) => {
      const cost = t.cards.reduce((s, c) => s + c.purchasePrice, 0);
      const market = t.cards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
      const payBadge =
        t.paymentType === "CASH"
          ? `<span class="badge badge-green">Cash</span>`
          : `<span class="badge badge-blue">Store Credit</span>`;
      return `<tr>
        <td><strong>#${t.number}</strong></td>
        <td>${t.createdAt.toLocaleDateString("en-GB")}</td>
        <td>${t.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
        <td>${payBadge}</td>
        <td>${t.cards.length}</td>
        <td class="right mono">${gbp(cost)}</td>
        <td class="right mono">${market > 0 ? gbp(market) : "—"}</td>
      </tr>`;
    })
    .join("");

  const summaryTable = `
    <table>
      <thead><tr><th>Trade #</th><th>Date</th><th>Time</th><th>Payment</th><th>Cards</th><th class="right">Cost</th><th class="right">Market Value</th></tr></thead>
      <tbody>${tradeRows}</tbody>
      <tfoot><tr><td colspan="4"><strong>Total</strong></td><td><strong>${totalCards}</strong></td><td class="right mono"><strong>${gbp(totalCost)}</strong></td><td></td></tr></tfoot>
    </table>`;

  const tradeDetails = trades
    .map((t) => {
      const cardRows = t.cards
        .map(
          (c) =>
            `<tr>
              <td>${c.name}</td>
              <td>${c.set}${c.setNumber ? ` #${c.setNumber}` : ""}</td>
              <td>${c.condition}</td>
              <td class="right mono">${gbp(c.purchasePrice)}</td>
              <td class="right mono">${c.marketValue ? gbp(c.marketValue) : "—"}</td>
            </tr>`
        )
        .join("");
      return `
        <div class="trade-section">
          <h3>Trade #${t.number} &mdash; ${t.createdAt.toLocaleDateString("en-GB")} &middot; ${t.paymentType === "STORE_CREDIT" ? "Store Credit" : "Purchase"}</h3>
          <table>
            <thead><tr><th>Card</th><th>Set</th><th>Cond.</th><th class="right">Purchase Price</th><th class="right">Market Value</th></tr></thead>
            <tbody>${cardRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  const html = printHtml(
    "Trade History Report",
    periodLabel,
    summaryRow + summaryTable + tradeDetails
  );

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
