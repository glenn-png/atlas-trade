import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { printHtml, gbp } from "@/lib/printHtml";

export async function GET(_req: NextRequest) {
  const cards = await prisma.card.findMany({
    where: { status: "IN_STOCK" },
    include: { trade: { select: { number: true } } },
    orderBy: { acquiredAt: "desc" },
  });

  const totalCost = cards.reduce((s, c) => s + c.purchasePrice, 0);
  const totalMarket = cards.reduce((s, c) => s + (c.marketValue ?? c.purchasePrice), 0);
  const totalGain = totalMarket - totalCost;

  const summaryGrid = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-label">Cards in Stock</div><div class="summary-value">${cards.length}</div></div>
      <div class="summary-cell"><div class="summary-label">Cost Value</div><div class="summary-value">${gbp(totalCost)}</div></div>
      <div class="summary-cell"><div class="summary-label">Market Value</div><div class="summary-value">${gbp(totalMarket)}</div></div>
      <div class="summary-cell"><div class="summary-label">Unrealised Gain</div><div class="summary-value">${gbp(totalGain)}</div></div>
    </div>`;

  const rows = cards
    .map((c) => {
      const market = c.marketValue ?? c.purchasePrice;
      const gain = market - c.purchasePrice;
      const gainPct =
        c.purchasePrice > 0 ? (((market - c.purchasePrice) / c.purchasePrice) * 100).toFixed(1) : "—";
      return `<tr>
        <td>${c.trade ? `#${c.trade.number}` : "—"}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.set}${c.setNumber ? ` #${c.setNumber}` : ""}</td>
        <td>${c.condition}</td>
        <td class="right mono">${gbp(c.purchasePrice)}</td>
        <td class="right mono">${c.marketValue ? gbp(c.marketValue) : "—"}</td>
        <td class="right mono">${c.marketValue ? gbp(gain) : "—"}</td>
        <td class="right mono">${c.marketValue ? `${gainPct}%` : "—"}</td>
        <td>${c.acquiredAt.toLocaleDateString("en-GB")}</td>
      </tr>`;
    })
    .join("");

  const table = `
    <table>
      <thead><tr><th>Trade</th><th>Card</th><th>Set</th><th>Cond.</th><th class="right">Cost</th><th class="right">Market Value</th><th class="right">Gain</th><th class="right">Gain %</th><th>Acquired</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4"><strong>Total (${cards.length} cards)</strong></td>
          <td class="right mono"><strong>${gbp(totalCost)}</strong></td>
          <td class="right mono"><strong>${gbp(totalMarket)}</strong></td>
          <td class="right mono"><strong>${gbp(totalGain)}</strong></td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>`;

  const html = printHtml(
    "Stock Valuation Report",
    `As of ${new Date().toLocaleDateString("en-GB")}`,
    summaryGrid + table
  );

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
