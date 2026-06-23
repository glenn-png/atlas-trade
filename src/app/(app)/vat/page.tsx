export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { ManualSalesDayEntry, SalesDayDeleteButton } from "./VATClient";

function getQuarter(date: Date) {
  return Math.floor(date.getMonth() / 3);
}

function quarterLabel(year: number, q: number) {
  return `Q${q + 1} ${year}`;
}

function quarterDates(year: number, q: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const start = q * 3;
  return `${months[start]} – ${months[start + 2]} ${year}`;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default async function VATPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQ = getQuarter(now);

  // Purchases: sum of all trade-in purchase prices by quarter
  const allCards = await prisma.card.findMany({
    select: { purchasePrice: true, acquiredAt: true },
  });

  // Sales: from SalesDay table
  const allSalesDays = await prisma.salesDay.findMany({
    orderBy: { date: "desc" },
  });

  // Build quarterly buckets (last 6 quarters)
  type QKey = string;
  const quarters: Record<QKey, { purchases: number; sales: number }> = {};

  for (const card of allCards) {
    const d = card.acquiredAt;
    const qKey = `${d.getFullYear()}-${getQuarter(d)}`;
    if (!quarters[qKey]) quarters[qKey] = { purchases: 0, sales: 0 };
    quarters[qKey].purchases += card.purchasePrice;
  }

  for (const sd of allSalesDays) {
    const d = new Date(sd.date);
    const qKey = `${d.getFullYear()}-${getQuarter(d)}`;
    if (!quarters[qKey]) quarters[qKey] = { purchases: 0, sales: 0 };
    quarters[qKey].sales += sd.msSinglesTotal;
  }

  const quarterKeys = Object.keys(quarters)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 6);

  // Current quarter data
  const currentQKey = `${currentYear}-${currentQ}`;
  const currentQData = quarters[currentQKey] ?? { purchases: 0, sales: 0 };
  const currentMargin = currentQData.sales - currentQData.purchases;
  const currentVAT = currentMargin > 0 ? currentMargin / 6 : 0;

  // VAT deadline: 7th of the month following end of quarter
  const qEndMonth = (currentQ + 1) * 3; // e.g. Q2 ends June (month 5), deadline = 7 Aug
  const vatDeadline = new Date(currentYear, qEndMonth + 1, 7);
  const daysToDeadline = Math.ceil((vatDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Monthly breakdown (last 6 months)
  const monthly: Record<string, { purchases: number; sales: number }> = {};

  for (const card of allCards) {
    const d = card.acquiredAt;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthly[key]) monthly[key] = { purchases: 0, sales: 0 };
    monthly[key].purchases += card.purchasePrice;
  }

  for (const sd of allSalesDays) {
    const d = new Date(sd.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthly[key]) monthly[key] = { purchases: 0, sales: 0 };
    monthly[key].sales += sd.msSinglesTotal;
  }

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, year: d.getFullYear(), month: d.getMonth() };
  });

  // Recent sales days for the log (last 30)
  const recentSalesDays = allSalesDays.slice(0, 30);

  return (
    <div>
      <div className="bg-navy-900 border-b border-white/7 px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white">VAT Centre</div>
          <div className="text-[13px] text-slate-400">UK Margin Scheme · Global Accounting Method</div>
        </div>
        <a
          href="/api/vat-export?format=csv"
          className="px-3 py-1.5 bg-accent text-white text-[12px] font-semibold rounded-[6px] hover:bg-accent-hover transition-colors"
        >
          ⬇ Export CSV
        </a>
      </div>

      <div className="p-6 space-y-6">

        {/* Current quarter alert */}
        <div className={`border rounded-[10px] px-4 py-3 flex items-center gap-3.5 ${
          daysToDeadline <= 30
            ? "bg-warning/12 border-warning/30"
            : "bg-navy-800 border-white/7"
        }`}>
          <span className="text-[20px]">{daysToDeadline <= 30 ? "⚠" : "📋"}</span>
          <div className="flex-1">
            <div className={`text-[13px] font-semibold ${daysToDeadline <= 30 ? "text-warning" : "text-white"}`}>
              {quarterLabel(currentYear, currentQ)} · VAT return due in {daysToDeadline} days
            </div>
            <div className="text-[12px] text-slate-300 mt-0.5">
              Purchases: <strong>{formatGBP(currentQData.purchases)}</strong> ·{" "}
              Sales: <strong>{currentQData.sales > 0 ? formatGBP(currentQData.sales) : "no data yet"}</strong> ·{" "}
              {currentMargin > 0
                ? <>VAT due: <strong className="text-warning">{formatGBP(currentVAT)}</strong></>
                : <span className="text-slate-400">No VAT due (purchases exceed sales)</span>
              }
            </div>
          </div>
        </div>

        {/* Quarterly Summary */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Quarterly Summary</div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy-900">
                  {["Quarter", "Period", "Purchases", "Sales (SumUp)", "Margin", "VAT Due (1/6)", "Status"].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quarterKeys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No data yet. Add sales entries below or complete some trade-ins.
                    </td>
                  </tr>
                ) : (
                  quarterKeys.map((qKey) => {
                    const [y, q] = qKey.split("-").map(Number);
                    const data = quarters[qKey];
                    const margin = data.sales - data.purchases;
                    const vat = margin > 0 ? margin / 6 : 0;
                    const isCurrent = y === currentYear && q === currentQ;
                    return (
                      <tr key={qKey} className={`border-b border-white/7 last:border-0 ${isCurrent ? "bg-warning/4" : ""}`}>
                        <td className="px-3.5 py-3 font-bold text-white">{quarterLabel(y, q)}</td>
                        <td className="px-3.5 py-3 text-slate-400 text-[12px]">{quarterDates(y, q)}</td>
                        <td className="px-3.5 py-3 font-mono text-slate-200">{formatGBP(data.purchases)}</td>
                        <td className="px-3.5 py-3 font-mono text-slate-200">
                          {data.sales > 0 ? formatGBP(data.sales) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-3.5 py-3 font-mono">
                          {data.sales > 0 ? (
                            <span className={margin > 0 ? "text-success" : "text-slate-400"}>{formatGBP(margin)}</span>
                          ) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-3.5 py-3 font-mono font-bold" style={{ color: isCurrent ? "var(--color-warning)" : "var(--color-success)" }}>
                          {vat > 0 ? formatGBP(vat) : <span className="text-slate-400 font-normal">£0.00</span>}
                        </td>
                        <td className="px-3.5 py-3">
                          <Badge variant={isCurrent ? "amber" : "green"}>
                            {isCurrent ? "In Progress" : "Filed"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Monthly breakdown */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Monthly Breakdown</div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy-900">
                  {["Month", "Purchases", "Sales", "Margin", "VAT Due", "Quarter"].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {last6Months.map(({ key, year, month }) => {
                  const data = monthly[key];
                  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
                  const q = Math.floor(month / 3);
                  const isCurrent = year === currentYear && q === currentQ;
                  const margin = data ? data.sales - data.purchases : 0;
                  const vat = margin > 0 ? margin / 6 : 0;
                  return (
                    <tr key={key} className={`border-b border-white/7 last:border-0 ${isCurrentMonth ? "bg-accent/4" : ""}`}>
                      <td className="px-3.5 py-3 font-semibold text-white">{MONTH_NAMES[month]} {year}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-200">{data ? formatGBP(data.purchases) : "—"}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-200">{data?.sales ? formatGBP(data.sales) : "—"}</td>
                      <td className="px-3.5 py-3 font-mono">{data?.sales ? <span className={margin > 0 ? "text-success" : "text-slate-400"}>{formatGBP(margin)}</span> : "—"}</td>
                      <td className="px-3.5 py-3 font-mono text-warning">{vat > 0 ? formatGBP(vat) : "—"}</td>
                      <td className="px-3.5 py-3">
                        <Badge variant={isCurrent ? "amber" : "green"}>{quarterLabel(year, q)}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manual Sales Entry */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Sales Log — MS Single Cards</div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] p-4 space-y-4">
            <div className="text-[12px] text-slate-400">
              Enter your daily "MS - Single Cards" total from SumUp. Once SumUp is connected in Settings, this will fill automatically.
            </div>

            <ManualSalesDayEntry />

            {/* Recent entries */}
            {recentSalesDays.length > 0 && (
              <div className="border-t border-white/7 pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Recent entries</div>
                <div className="space-y-1">
                  {recentSalesDays.map((sd) => {
                    const d = new Date(sd.date);
                    return (
                      <div key={sd.id} className="flex items-center justify-between py-1.5 px-2 rounded-[4px] hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-slate-300 font-mono w-[100px]">
                            {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-[12px] font-mono text-white font-semibold">{formatGBP(sd.msSinglesTotal)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            sd.source === "SUMUP"
                              ? "bg-accent/15 text-accent"
                              : "bg-white/7 text-slate-400"
                          }`}>
                            {sd.source}
                          </span>
                        </div>
                        <SalesDayDeleteButton id={sd.id} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Explainer */}
        <div className="bg-navy-800 border border-white/7 rounded-[10px] p-5 flex gap-6">
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-white mb-1">Global Accounting Method</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">
              Atlas uses the Global Accounting Method for the UK VAT Margin Scheme. VAT is calculated on the total margin across all eligible goods in the period —
              not per item. Formula:{" "}
              <code className="text-white font-mono">VAT = (Total Sales − Total Purchases) × 1/6</code>
            </div>
          </div>
          <div className="bg-navy-900 rounded-[6px] px-4 py-3.5 min-w-[210px] shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Example Quarter</div>
            <div className="text-[12px] text-slate-400 font-mono leading-[1.8]">
              Sales:     £14,200<br />
              Purchases:  £8,420<br />
              Margin:     £5,780<br />
              VAT = £5,780 ÷ 6 = <span className="text-warning">£963.33</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
