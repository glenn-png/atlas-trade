import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { printHtml, gbp } from "@/lib/printHtml";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "IN_STOCK";

  const where = status === "ALL" ? {} : { status: status as "IN_STOCK" | "SOLD" | "RESERVED" };

  const cards = await prisma.card.findMany({
    where,
    include: { trade: { select: { number: true } } },
    orderBy: { acquiredAt: "desc" },
  });

  const totalCost = cards.reduce((s, c) => s + c.purchasePrice, 0);
  const totalMarket = cards.reduce((s, c) => s + (c.marketValue ?? c.purchasePrice), 0);
  const statusLabel =
    status === "IN_STOCK" ? "In Stock" : status === "SOLD" ? "Sold" : "All Cards";

  const summaryGrid = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-label">Cards</div><div class="summary-value">${cards.length}</div></div>
      <div class="summary-cell"><div class="summary-label">Cost Value</div><div class="summary-value">${gbp(totalCost)}</div></div>
      <div class="summary-cell"><div class="summary-label">Market Value</div><div class="summary-value">${gbp(totalMarket)}</div></div>
      <div class="summary-cell"><div class="summary-label">Unrealised Gain</div><div class="summary-value">${gbp(totalMarket - totalCost)}</div></div>
    </div>`;

  const rows = cards
    .map((c) => {
      const market = c.marketValue ?? c.purchasePrice;
      const gain = market - c.purchasePrice;
      return `<tr>
        <td>${c.trade ? `#${c.trade.number}` : "—"}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.set}${c.setNumber ? ` #${c.setNumber}` : ""}</td>
        <td>${c.condition}</td>
        <td class="right mono">${gbp(c.purchasePrice)}</td>
        <td class="right mono">${c.marketValue ? gbp(c.marketValue) : "—"}</td>
        <td class="right mono">${c.marketValue ? gbp(gain) : "—"}</td>
        <td>${c.status === "IN_STOCK" ? "In Stock" : c.status === "SOLD" ? "Sold" : "Reserved"}</td>
        <td>${c.acquiredAt.toLocaleDateString("en-GB")}</td>
      </tr>`;
    })
    .join("");

  const table = `
    <table>
      <thead><tr><th>Trade</th><th>Card</th><th>Set</th><th>Cond.</th><th class="right">Purchase Price</th><th class="right">Market Value</th><th class="right">Gain</th><th>Status</th><th>Acquired</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4"><strong>Total (${cards.length} cards)</strong></td>
          <td class="right mono"><strong>${gbp(totalCost)}</strong></td>
          <td class="right mono"><strong>${gbp(totalMarket)}</strong></td>
          <td class="right mono"><strong>${gbp(totalMarket - totalCost)}</strong></td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>`;

  const html = printHtml(
    "Inventory Report",
    `${statusLabel} · ${new Date().toLocaleDateString("en-GB")}`,
    summaryGrid + table
  );

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
