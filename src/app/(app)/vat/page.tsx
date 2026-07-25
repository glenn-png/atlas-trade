export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { FilingButton } from "./FilingButton";

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

  // Filed quarters
  const filings = await prisma.vatFiling.findMany();
  const filedMap = new Map(filings.map((f) => [f.quarter, f.filedAt]));

  // All cards with purchase price and market value
  const cards = await prisma.card.findMany({
    select: {
      id: true,
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
    orderBy: { acquiredAt: "desc" },
  });

  // VAT estimate per card: max(0, market - purchase) / 6
  // Only cards with a market value set
  const vatCards = cards.filter((c) => c.marketValue != null && c.marketValue > c.purchasePrice);

  // ── Quarterly buckets ──────────────────────────────────────────────────────
  type QData = {
    cards: number;
    paid: number;
    market: number;
    purchase: { paid: number; market: number };
    credit: { paid: number; market: number };
  };
  const quarters: Record<string, QData> = {};

  for (const card of vatCards) {
    const d = card.acquiredAt;
    const key = `${d.getFullYear()}-${getQuarter(d)}`;
    if (!quarters[key]) quarters[key] = { cards: 0, paid: 0, market: 0, purchase: { paid: 0, market: 0 }, credit: { paid: 0, market: 0 } };
    quarters[key].cards++;
    quarters[key].paid += card.purchasePrice;
    quarters[key].market += card.marketValue!;
    if (card.paymentType === "PURCHASE") {
      quarters[key].purchase.paid += card.purchasePrice;
      quarters[key].purchase.market += card.marketValue!;
    } else {
      quarters[key].credit.paid += card.purchasePrice;
      quarters[key].credit.market += card.marketValue!;
    }
  }

  const quarterKeys = Object.keys(quarters).sort((a, b) => b.localeCompare(a)).slice(0, 8);

  // ── Monthly buckets (last 6) ───────────────────────────────────────────────
  type MData = { cards: number; paid: number; market: number };
  const monthly: Record<string, MData> = {};

  for (const card of vatCards) {
    const d = card.acquiredAt;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthly[key]) monthly[key] = { cards: 0, paid: 0, market: 0 };
    monthly[key].cards++;
    monthly[key].paid += card.purchasePrice;
    monthly[key].market += card.marketValue!;
  }

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, year: d.getFullYear(), month: d.getMonth() };
  });

  // ── Current quarter ────────────────────────────────────────────────────────
  const currentQKey = `${currentYear}-${currentQ}`;
  const currentQData = quarters[currentQKey];
  const currentMargin = currentQData ? currentQData.market - currentQData.paid : 0;
  const currentVAT = currentMargin > 0 ? currentMargin / 6 : 0;

  // ── In-stock snapshot ──────────────────────────────────────────────────────
  const inStockCards = cards.filter((c) => c.status === "IN_STOCK" && c.marketValue != null);
  const inStockPaid = inStockCards.reduce((s, c) => s + c.purchasePrice, 0);
  const inStockMarket = inStockCards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
  const inStockMargin = inStockMarket - inStockPaid;
  const inStockVAT = inStockMargin > 0 ? inStockMargin / 6 : 0;

  // ── Overall totals ─────────────────────────────────────────────────────────
  const totalPaid = vatCards.reduce((s, c) => s + c.purchasePrice, 0);
  const totalMarket = vatCards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
  const totalMargin = totalMarket - totalPaid;
  const totalVAT = totalMargin > 0 ? totalMargin / 6 : 0;

  // VAT deadline
  const qEndMonth = (currentQ + 1) * 3;
  const vatDeadline = new Date(currentYear, qEndMonth + 1, 7);
  const daysToDeadline = Math.ceil((vatDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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

        {/* Current quarter banner */}
        <div className={`border rounded-[10px] px-4 py-3 flex items-center gap-3.5 ${
          daysToDeadline <= 30 ? "bg-warning/12 border-warning/30" : "bg-navy-800 border-white/7"
        }`}>
          <span className="text-[20px]">{daysToDeadline <= 30 ? "⚠" : "📋"}</span>
          <div className="flex-1">
            <div className={`text-[13px] font-semibold ${daysToDeadline <= 30 ? "text-warning" : "text-white"}`}>
              {quarterLabel(currentYear, currentQ)} · VAT return due in {daysToDeadline} days
            </div>
            <div className="text-[12px] text-slate-300 mt-0.5">
              {currentQData
                ? <>
                    {currentQData.cards} cards · Paid <strong>{formatGBP(currentQData.paid)}</strong> ·{" "}
                    Market <strong>{formatGBP(currentQData.market)}</strong> ·{" "}
                    Est. VAT: <strong className="text-warning">{formatGBP(currentVAT)}</strong>
                  </>
                : <span className="text-slate-400">No cards with market values acquired this quarter yet</span>
              }
            </div>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Total paid (all cards)</div>
            <div className="text-[22px] font-bold text-warning">{formatGBP(totalPaid)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{vatCards.length} cards with market value</div>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Total market value</div>
            <div className="text-[22px] font-bold text-success">{formatGBP(totalMarket)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">at current market prices</div>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Total margin</div>
            <div className={`text-[22px] font-bold ${totalMargin > 0 ? "text-success" : "text-slate-400"}`}>
              {formatGBP(totalMargin)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">market − paid</div>
          </div>
          <div className="bg-navy-800 border border-danger/20 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Total est. VAT liability</div>
            <div className="text-[22px] font-bold text-warning">{formatGBP(totalVAT)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">margin ÷ 6 · all cards</div>
          </div>
        </div>

        {/* In-stock snapshot */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Current Inventory Liability</div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[11px] text-slate-400 mb-0.5">Cards in stock</div>
              <div className="text-[18px] font-bold text-white">{inStockCards.length}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 mb-0.5">Total paid</div>
              <div className="text-[18px] font-bold text-warning">{formatGBP(inStockPaid)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 mb-0.5">Market value</div>
              <div className="text-[18px] font-bold text-success">{formatGBP(inStockMarket)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 mb-0.5">Est. VAT if sold at market</div>
              <div className="text-[18px] font-bold text-warning">{formatGBP(inStockVAT)}</div>
            </div>
          </div>
        </section>

        {/* Quarterly summary */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Quarterly Summary</div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy-900">
                  {["Quarter", "Period", "Cards", "Total Paid", "Market Value", "Margin", "Est. VAT (÷6)", "Status"].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quarterKeys.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No cards with market values yet.
                    </td>
                  </tr>
                ) : (
                  quarterKeys.map((qKey) => {
                    const [y, q] = qKey.split("-").map(Number);
                    const data = quarters[qKey];
                    const margin = data.market - data.paid;
                    const vat = margin > 0 ? margin / 6 : 0;
                    const isCurrent = y === currentYear && q === currentQ;
                    const qLabel = quarterLabel(y, q);
                    const filedAt = filedMap.get(qLabel);
                    const filed = !!filedAt;
                    return (
                      <tr key={qKey} className={`border-b border-white/7 last:border-0 ${isCurrent ? "bg-warning/4" : ""}`}>
                        <td className="px-3.5 py-3 font-bold text-white">{qLabel}</td>
                        <td className="px-3.5 py-3 text-slate-400 text-[12px]">{quarterDates(y, q)}</td>
                        <td className="px-3.5 py-3 text-slate-300">{data.cards}</td>
                        <td className="px-3.5 py-3 font-mono text-warning">{formatGBP(data.paid)}</td>
                        <td className="px-3.5 py-3 font-mono text-success">{formatGBP(data.market)}</td>
                        <td className="px-3.5 py-3 font-mono">
                          <span className={margin > 0 ? "text-success" : "text-slate-400"}>{formatGBP(margin)}</span>
                        </td>
                        <td className="px-3.5 py-3 font-mono font-bold text-warning">
                          {formatGBP(vat)}
                        </td>
                        <td className="px-3.5 py-3">
                          {isCurrent
                            ? <span className="text-[11px] text-slate-400 italic">In progress</span>
                            : <FilingButton quarter={qLabel} filed={filed} filedAt={filedAt?.toISOString()} />
                          }
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
                  {["Month", "Cards", "Total Paid", "Market Value", "Margin", "Est. VAT", "Quarter"].map((h) => (
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
                  const margin = data ? data.market - data.paid : 0;
                  const vat = margin > 0 ? margin / 6 : 0;
                  return (
                    <tr key={key} className={`border-b border-white/7 last:border-0 ${isCurrentMonth ? "bg-accent/4" : ""}`}>
                      <td className="px-3.5 py-3 font-semibold text-white">{MONTH_NAMES[month]} {year}</td>
                      <td className="px-3.5 py-3 text-slate-300">{data?.cards ?? "—"}</td>
                      <td className="px-3.5 py-3 font-mono text-warning">{data ? formatGBP(data.paid) : "—"}</td>
                      <td className="px-3.5 py-3 font-mono text-success">{data ? formatGBP(data.market) : "—"}</td>
                      <td className="px-3.5 py-3 font-mono">
                        {data ? <span className={margin > 0 ? "text-success" : "text-slate-400"}>{formatGBP(margin)}</span> : "—"}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-warning">{data && vat > 0 ? formatGBP(vat) : "—"}</td>
                      <td className="px-3.5 py-3 text-[12px] text-slate-400">
                        {quarterLabel(year, q)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Explainer */}
        <div className="bg-navy-800 border border-white/7 rounded-[10px] p-5 flex gap-6">
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-white mb-1">How this is calculated</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">
              Every card in ATLAS has a purchase price (what was paid — 70% cash or 80% credit) and a market value (expected sale price).
              The VAT estimate uses the margin on each card:{" "}
              <code className="text-white font-mono">VAT = (Market Value − Purchase Price) ÷ 6</code>.
              Only cards where market value exceeds purchase price are included.
            </div>
          </div>
          <div className="bg-navy-900 rounded-[6px] px-4 py-3.5 min-w-[210px] shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Example</div>
            <div className="text-[12px] text-slate-400 font-mono leading-[1.8]">
              Market:    £100<br />
              Paid (70%): £70<br />
              Margin:     £30<br />
              VAT = £30 ÷ 6 = <span className="text-warning">£5.00</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
