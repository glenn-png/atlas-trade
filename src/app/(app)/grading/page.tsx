export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { Plus } from "lucide-react";

type Period = "daily" | "weekly" | "monthly" | "all";

function getPeriodRanges(period: Period, offset: number = 0): {
  label: string;
  current: { from: Date; to: Date } | null;
} {
  if (period === "all") return { label: "All time", current: null };

  const now = new Date();

  if (period === "daily") {
    const from = new Date(now);
    from.setDate(from.getDate() + offset);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setHours(23, 59, 59, 999);
    const isToday = offset === 0;
    return {
      label: isToday
        ? `Today — ${from.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
        : from.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      current: { from, to },
    };
  }

  if (period === "weekly") {
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dow + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const isThisWeek = offset === 0;
    return {
      label: isThisWeek
        ? `This week — ${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
        : `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
      current: { from: monday, to: sunday },
    };
  }

  // monthly
  const month = now.getMonth() + offset;
  const year = now.getFullYear() + Math.floor(month / 12);
  const normMonth = ((month % 12) + 12) % 12;
  const from = new Date(year, normMonth, 1);
  const to = new Date(year, normMonth + 1, 0, 23, 59, 59, 999);
  const isThisMonth = offset === 0;
  return {
    label: isThisMonth
      ? `This month — ${from.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
      : from.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    current: { from, to },
  };
}

const COMPANIES: Record<string, { color: string; bg: string }> = {
  PSA:     { color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
  BGS:     { color: "text-yellow-400",  bg: "bg-yellow-400/10 border-yellow-400/20" },
  ACE:     { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  MGC:     { color: "text-purple-400",  bg: "bg-purple-400/10 border-purple-400/20" },
  Beckett: { color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/20" },
};

function CompanyBadge({ company }: { company: string }) {
  const style = COMPANIES[company] ?? { color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20" };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${style.bg} ${style.color}`}>
      {company}
    </span>
  );
}

const TABS: { key: Period; label: string; short: string }[] = [
  { key: "daily",   label: "Daily",   short: "D" },
  { key: "weekly",  label: "Weekly",  short: "W" },
  { key: "monthly", label: "Monthly", short: "M" },
  { key: "all",     label: "All",     short: "All" },
];

export default async function GradingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const period: Period = (["daily", "weekly", "monthly", "all"].includes(params.period ?? ""))
    ? (params.period as Period)
    : "all";
  const offset = parseInt(params.offset ?? "0") || 0;
  const clampedOffset = Math.min(0, offset);

  const { label, current } = getPeriodRanges(period, clampedOffset);

  // All submissions for active/completed lists (not period-filtered)
  const allSubmissions = await prisma.gradingSubmission.findMany({
    include: { cards: { include: { trade: { select: { number: true } } } } },
    orderBy: { submittedAt: "desc" },
  });

  const active = allSubmissions.filter((s) => s.status === "SUBMITTED");
  const activeCards = active.reduce((s, sub) => s + sub.cards.length, 0);

  // Period-filtered completed submissions for dashboard stats
  const completedAll = allSubmissions.filter((s) => s.status === "RETURNED");
  const completedInPeriod = current
    ? completedAll.filter((s) => {
        const d = s.returnedAt ?? s.submittedAt;
        return d >= current.from && d <= current.to;
      })
    : completedAll;

  const gradedCards = completedInPeriod.flatMap((s) => s.cards);
  const totalGradedCount = gradedCards.length;
  const totalPurchaseCost = gradedCards.reduce((s, c) => s + c.purchasePrice, 0);
  const totalGradingSpend = gradedCards.reduce((s, c) => s + (c.gradingCost ?? 0), 0);
  const totalMarketValue = gradedCards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
  const totalPnl = totalMarketValue - (totalPurchaseCost + totalGradingSpend);

  const companyTotals = completedInPeriod.reduce<Record<string, { count: number; pnl: number }>>((acc, sub) => {
    const purchaseCost = sub.cards.reduce((s, c) => s + c.purchasePrice, 0);
    const gradingCost = sub.cards.reduce((s, c) => s + (c.gradingCost ?? 0), 0);
    const market = sub.cards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
    if (!acc[sub.company]) acc[sub.company] = { count: 0, pnl: 0 };
    acc[sub.company].count += sub.cards.length;
    acc[sub.company].pnl += market - (purchaseCost + gradingCost);
    return acc;
  }, {});

  const hasStats = completedInPeriod.length > 0;

  return (
    <div>
      {/* Topbar */}
      <div className="bg-navy-900 border-b border-white/7 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-white">Grading</div>
            <div className="text-[12px] text-slate-400 truncate">{label}</div>
          </div>

          {/* Period tabs */}
          <div className="flex bg-navy-800 border border-white/7 rounded-[8px] p-0.5 gap-0.5">
            {TABS.map(({ key, label: tabLabel, short }) => (
              <a
                key={key}
                href={`?period=${key}&offset=0`}
                className={`px-2.5 sm:px-4 py-1.5 rounded-[6px] text-[12px] sm:text-[13px] font-semibold transition-all ${
                  period === key
                    ? "bg-navy-600 text-white border border-white/12"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{tabLabel}</span>
              </a>
            ))}
          </div>

          {/* Prev / Now / Next — hidden on "all" */}
          {period !== "all" && (
            <div className="flex items-center gap-1">
              <a
                href={`?period=${period}&offset=${clampedOffset - 1}`}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-navy-800 border border-white/7 text-slate-400 hover:text-white hover:border-white/20 transition-colors text-[14px]"
                title="Previous period"
              >‹</a>
              {clampedOffset < 0 && (
                <>
                  <a
                    href={`?period=${period}&offset=0`}
                    className="px-2 py-1 rounded-[6px] bg-navy-800 border border-white/7 text-slate-400 hover:text-white text-[11px] font-semibold transition-colors hidden sm:flex"
                  >
                    Now
                  </a>
                  <a
                    href={`?period=${period}&offset=${clampedOffset + 1}`}
                    className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-navy-800 border border-white/7 text-slate-400 hover:text-white hover:border-white/20 transition-colors text-[14px]"
                    title="Next period"
                  >›</a>
                </>
              )}
            </div>
          )}

          <Link
            href="/grading/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white text-[13px] font-semibold rounded-[8px] hover:bg-accent-hover transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Send for grading</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Grading Dashboard ── */}
        <section>
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
            Grading overview
          </div>

          {hasStats ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
                  <div className="text-[11px] text-slate-400 mb-1">Graded cards</div>
                  <div className="text-[22px] font-bold text-white">{totalGradedCount}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{completedInPeriod.length} submission{completedInPeriod.length !== 1 ? "s" : ""}</div>
                </div>
                <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
                  <div className="text-[11px] text-slate-400 mb-1">Grading spend</div>
                  <div className="text-[22px] font-bold text-warning">{formatGBP(totalGradingSpend)}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">fees paid</div>
                </div>
                <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
                  <div className="text-[11px] text-slate-400 mb-1">Market value</div>
                  <div className="text-[22px] font-bold text-success">{formatGBP(totalMarketValue)}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">paid {formatGBP(totalPurchaseCost)}</div>
                </div>
                <div className={`bg-navy-800 border rounded-[10px] px-4 py-3 ${totalPnl >= 0 ? "border-success/20" : "border-danger/20"}`}>
                  <div className="text-[11px] text-slate-400 mb-1">Total P&amp;L</div>
                  <div className={`text-[22px] font-bold ${totalPnl >= 0 ? "text-success" : "text-danger"}`}>
                    {totalPnl >= 0 ? "+" : ""}{formatGBP(totalPnl)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">market − (cost + fees)</div>
                </div>
              </div>

              {Object.keys(companyTotals).length > 1 && (
                <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/7 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    By company
                  </div>
                  <div className="divide-y divide-white/5">
                    {Object.entries(companyTotals).map(([company, { count, pnl }]) => (
                      <div key={company} className="px-4 py-3 flex items-center gap-3">
                        <CompanyBadge company={company} />
                        <span className="text-[13px] text-slate-300 flex-1">{count} card{count !== 1 ? "s" : ""}</span>
                        <span className={`text-[13px] font-mono font-semibold ${pnl >= 0 ? "text-success" : "text-danger"}`}>
                          {pnl >= 0 ? "+" : ""}{formatGBP(pnl)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-8 text-center">
              <div className="text-[13px] text-slate-500">No completed submissions in this period</div>
            </div>
          )}
        </section>

        {/* ── Active submissions ── */}
        <section>
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
            Active — out for grading ({active.length})
          </div>
          {active.length === 0 ? (
            <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-10 text-center">
              <div className="text-[32px] mb-3 opacity-30">🏆</div>
              <div className="text-[14px] font-semibold text-slate-400">No cards currently out for grading</div>
              <div className="text-[13px] text-slate-500 mt-1">
                <Link href="/grading/new" className="text-accent">Send cards for grading →</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((sub) => {
                const totalCost = sub.cards.reduce((s, c) => s + c.purchasePrice, 0);
                return (
                  <Link
                    key={sub.id}
                    href={`/grading/${sub.id}`}
                    className="block bg-navy-800 border border-white/7 rounded-[10px] px-4 sm:px-5 py-4 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <CompanyBadge company={sub.company} />
                          {sub.reference && (
                            <span className="text-[11px] font-mono text-slate-400">#{sub.reference}</span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            Sent {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="text-[13px] text-slate-300 mt-1.5 truncate">
                          {sub.cards.slice(0, 3).map((c) => c.name).join(", ")}
                          {sub.cards.length > 3 ? ` +${sub.cards.length - 3} more` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[15px] font-bold text-white">{sub.cards.length} card{sub.cards.length !== 1 ? "s" : ""}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">cost {formatGBP(totalCost)}</div>
                      </div>
                    </div>
                    {sub.notes && (
                      <div className="mt-2 text-[12px] text-slate-500 italic">{sub.notes}</div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Completed submissions ── */}
        {completedAll.length > 0 && (
          <section>
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
              Completed — returned ({completedAll.length})
            </div>
            <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-navy-900">
                    {["Company", "Ref", "Cards", "Returned", "Grading Cost", "P&L"].map((h) => (
                      <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completedAll.map((sub) => {
                    const purchaseCost = sub.cards.reduce((s, c) => s + c.purchasePrice, 0);
                    const gradingCost = sub.cards.reduce((s, c) => s + (c.gradingCost ?? 0), 0);
                    const marketValue = sub.cards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
                    const pnl = marketValue - (purchaseCost + gradingCost);
                    const inPeriod = current
                      ? (() => { const d = sub.returnedAt ?? sub.submittedAt; return d >= current.from && d <= current.to; })()
                      : true;
                    return (
                      <tr
                        key={sub.id}
                        className={`border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${!inPeriod && period !== "all" ? "opacity-40" : ""}`}
                      >
                        <td className="px-3.5 py-3">
                          <Link href={`/grading/${sub.id}`}><CompanyBadge company={sub.company} /></Link>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-400 text-[12px]">{sub.reference ?? "—"}</td>
                        <td className="px-3.5 py-3 text-slate-300">{sub.cards.length}</td>
                        <td className="px-3.5 py-3 text-slate-400 text-[12px]">
                          {sub.returnedAt
                            ? new Date(sub.returnedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-300">
                          {gradingCost > 0 ? formatGBP(gradingCost) : "—"}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[12px]">
                          <span className={pnl >= 0 ? "text-success" : "text-danger"}>
                            {pnl >= 0 ? "+" : ""}{formatGBP(pnl)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
