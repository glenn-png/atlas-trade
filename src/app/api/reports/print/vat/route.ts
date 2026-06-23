import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { printHtml, gbp } from "@/lib/printHtml";

function getQuarter(date: Date) {
  return Math.floor(date.getMonth() / 3);
}

function quarterLabel(year: number, q: number) {
  const months = [
    ["Jan", "Mar"],
    ["Apr", "Jun"],
    ["Jul", "Sep"],
    ["Oct", "Dec"],
  ];
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

  const [cards, salesDays] = await Promise.all([
    prisma.card.findMany({
      select: { purchasePrice: true, acquiredAt: true },
      where: hasRange ? { acquiredAt: dateWhere } : undefined,
    }),
    prisma.salesDay.findMany({
      where: hasRange ? { date: dateWhere } : undefined,
      orderBy: { date: "asc" },
    }),
  ]);

  // Build quarterly totals
  const quarters: Record<string, { purchases: number; sales: number; year: number; q: number }> = {};
  for (const c of cards) {
    const y = c.acquiredAt.getFullYear();
    const q = getQuarter(c.acquiredAt);
    const key = `${y}-${q}`;
    if (!quarters[key]) quarters[key] = { purchases: 0, sales: 0, year: y, q };
    quarters[key].purchases += c.purchasePrice;
  }
  for (const sd of salesDays) {
    const d = new Date(sd.date);
    const y = d.getFullYear();
    const q = getQuarter(d);
    const key = `${y}-${q}`;
    if (!quarters[key]) quarters[key] = { purchases: 0, sales: 0, year: y, q };
    quarters[key].sales += sd.msSinglesTotal;
  }

  const sortedQ = Object.entries(quarters).sort(([a], [b]) => a.localeCompare(b));

  const totalPurchases = sortedQ.reduce((s, [, d]) => s + d.purchases, 0);
  const totalSales = sortedQ.reduce((s, [, d]) => s + d.sales, 0);
  const totalMargin = totalSales - totalPurchases;
  const totalVAT = totalMargin > 0 ? totalMargin / 6 : 0;

  const periodLabel =
    from && to
      ? `${new Date(from).toLocaleDateString("en-GB")} – ${new Date(to).toLocaleDateString("en-GB")}`
      : "All time";

  const summaryGrid = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-label">Total Purchases</div><div class="summary-value">${gbp(totalPurchases)}</div></div>
      <div class="summary-cell"><div class="summary-label">Total Sales</div><div class="summary-value">${gbp(totalSales)}</div></div>
      <div class="summary-cell"><div class="summary-label">Margin</div><div class="summary-value">${gbp(totalMargin)}</div></div>
      <div class="summary-cell"><div class="summary-label">VAT Due</div><div class="summary-value">${gbp(totalVAT)}</div></div>
    </div>`;

  const qRows = sortedQ
    .map(([, d]) => {
      const margin = d.sales - d.purchases;
      const vat = margin > 0 ? margin / 6 : 0;
      return `<tr>
        <td>${quarterLabel(d.year, d.q)}</td>
        <td class="right mono">${gbp(d.purchases)}</td>
        <td class="right mono">${gbp(d.sales)}</td>
        <td class="right mono">${gbp(margin)}</td>
        <td class="right mono">${gbp(vat)}</td>
      </tr>`;
    })
    .join("");

  const qTable = `
    <h2>Quarterly VAT Summary</h2>
    <table>
      <thead><tr><th>Quarter</th><th class="right">Purchases</th><th class="right">MS-Singles Sales</th><th class="right">Margin</th><th class="right">VAT Due (1/6)</th></tr></thead>
      <tbody>${qRows}</tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td class="right mono"><strong>${gbp(totalPurchases)}</strong></td>
          <td class="right mono"><strong>${gbp(totalSales)}</strong></td>
          <td class="right mono"><strong>${gbp(totalMargin)}</strong></td>
          <td class="right mono"><strong>${gbp(totalVAT)}</strong></td>
        </tr>
      </tfoot>
    </table>`;

  const sdRows = salesDays
    .map(
      (sd) =>
        `<tr>
          <td>${new Date(sd.date).toLocaleDateString("en-GB")}</td>
          <td class="right mono">${gbp(sd.msSinglesTotal)}</td>
          <td><span class="badge ${sd.source === "SUMUP" ? "badge-blue" : "badge-green"}">${sd.source}</span></td>
        </tr>`
    )
    .join("");

  const sdTable = salesDays.length
    ? `<h2>MS-Singles Sales Log (${salesDays.length} days)</h2>
      <table>
        <thead><tr><th>Date</th><th class="right">Amount</th><th>Source</th></tr></thead>
        <tbody>${sdRows}</tbody>
      </table>`
    : `<h2>MS-Singles Sales Log</h2><p style="color:#777;font-size:11px;margin-bottom:16px">No sales entries for this period.</p>`;

  const note = `<p style="font-size:10px;color:#555;margin-bottom:20px;padding:10px;border:1px solid #ddd;border-radius:6px;">
    <strong>UK VAT Margin Scheme — Global Accounting Method.</strong>
    VAT is calculated as 1/6 of the positive margin (Total Sales − Total Purchases).
    This report is for reference only — verify with your accountant before filing.
  </p>`;

  const html = printHtml("VAT Summary Report", periodLabel, note + summaryGrid + qTable + sdTable);

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
