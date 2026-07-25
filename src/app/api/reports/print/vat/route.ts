import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { printHtml, gbp } from "@/lib/printHtml";

function getQuarter(date: Date) {
  return Math.floor(date.getMonth() / 3);
}

function quarterLabel(year: number, q: number) {
  const months = [["Jan", "Mar"], ["Apr", "Jun"], ["Jul", "Sep"], ["Oct", "Dec"]];
  return `Q${q + 1} ${year} (${months[q][0]}–${months[q][1]})`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateWhere = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
  };
  const hasRange = Object.keys(dateWhere).length > 0;

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
      ...(hasRange ? { acquiredAt: dateWhere } : {}),
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

  const sortedQ = Object.entries(quarters).sort(([a], [b]) => a.localeCompare(b));

  const totalPaid = sortedQ.reduce((s, [, d]) => s + d.purchases, 0);
  const totalMarket = sortedQ.reduce((s, [, d]) => s + d.market, 0);
  const totalMargin = totalMarket - totalPaid;
  const totalVAT = totalMargin > 0 ? totalMargin / 6 : 0;

  const periodLabel = from && to
    ? `${new Date(from).toLocaleDateString("en-GB")} – ${new Date(to).toLocaleDateString("en-GB")}`
    : "All time";

  const summaryGrid = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-label">Total Paid</div><div class="summary-value">${gbp(totalPaid)}</div></div>
      <div class="summary-cell"><div class="summary-label">Total Market Value</div><div class="summary-value">${gbp(totalMarket)}</div></div>
      <div class="summary-cell"><div class="summary-label">Margin</div><div class="summary-value">${gbp(totalMargin)}</div></div>
      <div class="summary-cell"><div class="summary-label">Est. VAT Due</div><div class="summary-value">${gbp(totalVAT)}</div></div>
    </div>`;

  const qRows = sortedQ.map(([, d]) => {
    const margin = d.market - d.purchases;
    const vat = margin > 0 ? margin / 6 : 0;
    const count = cards.filter(c =>
      c.acquiredAt.getFullYear() === d.year &&
      getQuarter(c.acquiredAt) === d.q &&
      c.marketValue != null
    ).length;
    return `<tr>
      <td>${quarterLabel(d.year, d.q)}</td>
      <td class="right">${count}</td>
      <td class="right mono">${gbp(d.purchases)}</td>
      <td class="right mono">${gbp(d.market)}</td>
      <td class="right mono">${gbp(margin)}</td>
      <td class="right mono">${gbp(vat)}</td>
    </tr>`;
  }).join("");

  const qTable = `
    <h2>Quarterly VAT Summary</h2>
    <table>
      <thead><tr><th>Quarter</th><th class="right">Cards</th><th class="right">Total Paid</th><th class="right">Market Value</th><th class="right">Margin</th><th class="right">Est. VAT (÷6)</th></tr></thead>
      <tbody>${qRows}</tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td class="right"><strong>${cards.length}</strong></td>
          <td class="right mono"><strong>${gbp(totalPaid)}</strong></td>
          <td class="right mono"><strong>${gbp(totalMarket)}</strong></td>
          <td class="right mono"><strong>${gbp(totalMargin)}</strong></td>
          <td class="right mono"><strong>${gbp(totalVAT)}</strong></td>
        </tr>
      </tfoot>
    </table>`;

  const cardRows = cards.filter(c => c.marketValue != null).map(c => {
    const margin = c.marketValue! - c.purchasePrice;
    const vat = margin > 0 ? margin / 6 : 0;
    return `<tr>
      <td>${c.name}${c.setNumber ? ` <span style="color:#999;font-size:10px">#${c.setNumber}</span>` : ""}</td>
      <td>${c.set}</td>
      <td>${c.paymentType === "CASH" ? "Cash" : c.paymentType === "STORE_CREDIT" ? "Credit" : "—"}</td>
      <td>${c.acquiredAt.toLocaleDateString("en-GB")}</td>
      <td class="right mono">${gbp(c.purchasePrice)}</td>
      <td class="right mono">${gbp(c.marketValue!)}</td>
      <td class="right mono">${margin > 0 ? gbp(margin) : "—"}</td>
      <td class="right mono">${vat > 0 ? gbp(vat) : "—"}</td>
    </tr>`;
  }).join("");

  const cardTable = `
    <h2>Card Ledger (${cards.filter(c => c.marketValue != null).length} cards)</h2>
    <table>
      <thead><tr><th>Card</th><th>Set</th><th>Payment</th><th>Acquired</th><th class="right">Buy Price</th><th class="right">Market Value</th><th class="right">Margin</th><th class="right">Est. VAT</th></tr></thead>
      <tbody>${cardRows}</tbody>
    </table>`;

  const note = `<p style="font-size:10px;color:#555;margin-bottom:20px;padding:10px;border:1px solid #ddd;border-radius:6px;">
    <strong>UK VAT Margin Scheme — Global Accounting Method.</strong>
    VAT is estimated as 1/6 of the positive margin per card (Market Value − Buy Price).
    Buy price reflects payment type: 70% of market for cash, 80% for store credit.
    This report is for reference only — verify with your accountant before filing.
  </p>`;

  const html = printHtml("VAT Summary Report", periodLabel, note + summaryGrid + qTable + cardTable);

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
