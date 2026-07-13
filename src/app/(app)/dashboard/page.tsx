export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { Badge } from "@/components/Badge";

type Period = "daily" | "weekly" | "monthly";

function getPeriodRanges(period: Period, offset: number = 0): {
  label: string;
  current: { from: Date; to: Date };
  previous: { from: Date; to: Date };
} {
  const now = new Date();

  if (period === "daily") {
    const from = new Date(now);
    from.setDate(from.getDate() + offset);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setHours(23, 59, 59, 999);
    const prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - 1);
    const prevTo = new Date(prevFrom); prevTo.setHours(23, 59, 59, 999);
    const isToday = offset === 0;
    return {
      label: isToday
        ? `Today — ${from.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
        : from.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      current: { from, to },
      previous: { from: prevFrom, to: prevTo },
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
    const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);
    const prevSunday = new Date(sunday); prevSunday.setDate(sunday.getDate() - 7);
    const isThisWeek = offset === 0;
    return {
      label: isThisWeek
        ? `This week — ${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
        : `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
      current: { from: monday, to: sunday },
      previous: { from: prevMonday, to: prevSunday },
    };
  }

  // monthly
  const month = now.getMonth() + offset;
  const year = now.getFullYear() + Math.floor(month / 12);
  const normMonth = ((month % 12) + 12) % 12;
  const from = new Date(year, normMonth, 1);
  const to = new Date(year, normMonth + 1, 0, 23, 59, 59, 999);
  const prevFrom = new Date(year, normMonth - 1, 1);
  const prevTo = new Date(year, normMonth, 0, 23, 59, 59, 999);
  const isThisMonth = offset === 0;
  return {
    label: isThisMonth
      ? `This month — ${from.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
      : from.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    current: { from, to },
    previous: { from: prevFrom, to: prevTo },
  };
}

function delta(current: number, previous: number): { value: number; label: string; positive: boolean } | null {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  return {
    value: diff,
    label: `${diff >= 0 ? "+" : ""}${pct}% vs prev`,
    positive: diff >= 0,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const period: Period = (["daily", "weekly", "monthly"].includes(params.period ?? ""))
    ? (params.period as Period)
    : "daily";
  const offset = parseInt(params.offset ?? "0") || 0;
  const clampedOffset = Math.min(0, offset); // prevent navigating into the future

  const { label, current, previous } = getPeriodRanges(period, clampedOffset);
  const now = new Date();
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);

  const [
    currentTrades,
    previousTrades,
    currentSalesDays,
    previousSalesDays,
    quarterSalesDays,
    quarterPurchases,
    allInStock,
    recentTrades,
  ] = await Promise.all([
    // Trades in current period (with cards for cost)
    prisma.trade.findMany({
      where: { createdAt: { gte: current.from, lte: current.to } },
      include: { cards: { select: { purchasePrice: true, marketValue: true, name: true, set: true, setNumber: true, condition: true, paymentType: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // Trades in previous period
    prisma.trade.findMany({
      where: { createdAt: { gte: previous.from, lte: previous.to } },
      include: { cards: { select: { purchasePrice: true } } },
    }),
    // SalesDay totals for current period
    prisma.salesDay.findMany({
      where: { date: { gte: current.from, lte: current.to } },
    }),
    // SalesDay totals for previous period
    prisma.salesDay.findMany({
      where: { date: { gte: previous.from, lte: previous.to } },
    }),
    // Current quarter SalesDay (for VAT estimate)
    prisma.salesDay.findMany({ where: { date: { gte: quarterStart } } }),
    // Current quarter trade-in costs
    prisma.card.aggregate({
      where: { acquiredAt: { gte: quarterStart } },
      _sum: { purchasePrice: true },
    }),
    // All in-stock inventory
    prisma.card.aggregate({
      where: { status: "IN_STOCK" },
      _count: true,
      _sum: { purchasePrice: true, marketValue: true },
    }),
    // Recent trades (last 10) in current period
    prisma.trade.findMany({
      where: { createdAt: { gte: current.from, lte: current.to } },
      include: { cards: { select: { purchasePrice: true, name: true, set: true, setNumber: true, condition: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const currentRevenue = currentSalesDays.reduce((s, d) => s + d.msSinglesTotal, 0);
  const previousRevenue = previousSalesDays.reduce((s, d) => s + d.msSinglesTotal, 0);
  const currentCost = currentTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0), 0);
  const previousCost = previousTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0), 0);
  const currentTradeCount = currentTrades.length;
  const previousTradeCount = previousTrades.length;
  const currentCardCount = currentTrades.reduce((s, t) => s + t.cards.length, 0);
  const previousCardCount = previousTrades.reduce((s, t) => s + t.cards.length, 0);

  const quarterSales = quarterSalesDays.reduce((s, d) => s + d.msSinglesTotal, 0);
  const quarterCost = quarterPurchases._sum.purchasePrice ?? 0;
  const quarterMargin = quarterSales - quarterCost;
  const quarterVAT = quarterMargin > 0 ? quarterMargin / 6 : 0;

  const inventoryValue = allInStock._sum.purchasePrice ?? 0;
  const marketValue = allInStock._sum.marketValue ?? 0;
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;

  const tradeDelta = delta(currentTradeCount, previousTradeCount);
  const cardDelta = delta(currentCardCount, previousCardCount);
  const costDelta = delta(currentCost, previousCost);
  const revDelta = delta(currentRevenue, previousRevenue);

  const tabs: { key: Period; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  return (
    <div>
      {/* Topbar */}
      <div className="bg-navy-900 border-b border-white/7 px-6 py-3 flex items-center gap-6">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white">Dashboard</div>
          <div className="text-[13px] text-slate-400">{label}</div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prev / Next navigation */}
          <a
            href={`?period=${period}&offset=${clampedOffset - 1}`}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-navy-800 border border-white/7 text-slate-400 hover:text-white hover:border-white/20 transition-colors text-[14px]"
            title="Previous period"
          >‹</a>
          {clampedOffset < 0 && (
            <a
              href={`?period=${period}&offset=0`}
              className="px-2.5 py-1 rounded-[6px] bg-navy-800 border border-white/7 text-slate-400 hover:text-white text-[11px] font-semibold transition-colors"
            >
              Today
            </a>
          )}
          {clampedOffset < 0 && (
            <a
              href={`?period=${period}&offset=${clampedOffset + 1}`}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-navy-800 border border-white/7 text-slate-400 hover:text-white hover:border-white/20 transition-colors text-[14px]"
              title="Next period"
            >›</a>
          )}

          {/* Period tabs */}
          <div className="flex bg-navy-800 border border-white/7 rounded-[8px] p-0.5 gap-0.5">
            {tabs.map(({ key, label: tabLabel }) => (
              <a
                key={key}
                href={`?period=${key}&offset=0`}
                className={`px-4 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all ${
                  period === key
                    ? "bg-navy-600 text-white border border-white/12"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tabLabel}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">

        {/* Period stats */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">
            {tabs.find((t) => t.key === period)?.label} Overview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Trades"
              value={currentTradeCount.toString()}
              delta={tradeDelta}
              sub={currentCardCount > 0 ? `${currentCardCount} card${currentCardCount !== 1 ? "s" : ""}` : undefined}
            />
            <StatCard
              label="Cards Traded In"
              value={currentCardCount.toString()}
              delta={cardDelta}
              sub={currentTradeCount > 0 ? `across ${currentTradeCount} trade${currentTradeCount !== 1 ? "s" : ""}` : undefined}
            />
            <StatCard
              label="Purchase Cost"
              value={formatGBP(currentCost)}
              delta={costDelta ? { ...costDelta, positive: !costDelta.positive } : null}
              sub={currentCardCount > 0 ? `avg ${formatGBP(currentCost / currentCardCount)} per card` : undefined}
            />
            <StatCard
              label="MS-Singles Revenue"
              value={currentRevenue > 0 ? formatGBP(currentRevenue) : "—"}
              delta={revDelta}
              sub={currentSalesDays.length > 0 ? `${currentSalesDays.length} day${currentSalesDays.length !== 1 ? "s" : ""} logged` : "No SumUp data"}
            />
          </div>
        </section>

        {/* VAT estimate — always shows current quarter */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">
            {currentQuarter} VAT Estimate
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Purchases" value={formatGBP(quarterCost)} sub="from trade-ins" />
            <StatCard
              label="Sales (MS-Singles)"
              value={quarterSales > 0 ? formatGBP(quarterSales) : "—"}
              sub={quarterSalesDays.length > 0 ? `${quarterSalesDays.length} days logged` : "No SumUp data yet"}
            />
            <StatCard
              label="Margin"
              value={quarterSales > 0 ? formatGBP(quarterMargin) : "—"}
            />
            <StatCard
              label="VAT Due"
              value={quarterVAT > 0 ? formatGBP(quarterVAT) : "£0.00"}
              sub="margin × 1/6"
              highlight={quarterVAT > 0}
            />
          </div>
        </section>

        {/* Inventory snapshot — always current */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Inventory Snapshot</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Cards In Stock" value={allInStock._count.toString()} />
            <StatCard label="Cost Value" value={formatGBP(inventoryValue)} sub="at purchase price" />
            <StatCard label="Market Value" value={formatGBP(marketValue)} sub="current market" />
            <StatCard
              label="Unrealised Gain"
              value={formatGBP(marketValue - inventoryValue)}
              sub="vs purchase cost"
            />
          </div>
        </section>

        {/* Trade-ins in period */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
              Trades — {tabs.find((t) => t.key === period)?.label}
            </div>
            <a href="/inventory" className="text-[12px] text-accent">View inventory →</a>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
            {recentTrades.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 text-[13px]">
                No trades this {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}.
                <a href="/trade-in" className="ml-1 text-accent">Start a trade-in →</a>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-navy-900">
                    {["Trade", "Cards", "Total Cost", "Payment", "Time"].map((h) => (
                      <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => {
                    const tradeCost = trade.cards.reduce((s, c) => s + c.purchasePrice, 0);
                    return (
                      <tr key={trade.id} className="border-b border-white/7 last:border-0 hover:bg-white/[0.02]">
                        <td className="px-3.5 py-3">
                          <a href={`/trades/${trade.number}`} className="font-bold text-white hover:text-accent transition-colors">
                            Trade #{trade.number}
                          </a>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {trade.cards.slice(0, 2).map((c) => c.name).join(", ")}
                            {trade.cards.length > 2 ? ` +${trade.cards.length - 2} more` : ""}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-200">{trade.cards.length}</td>
                        <td className="px-3.5 py-3 font-mono text-success">{formatGBP(tradeCost)}</td>
                        <td className="px-3.5 py-3">
                          <Badge variant={trade.paymentType === "STORE_CREDIT" ? "blue" : "slate"}>
                            {trade.paymentType === "STORE_CREDIT" ? "Store Credit" : "Purchase"}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-3 text-slate-400 text-[12px]">
                          {trade.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          {period !== "daily" && (
                            <div>{trade.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
  delta: d,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  delta?: { label: string; positive: boolean } | null;
}) {
  return (
    <div className="bg-navy-800 border border-white/7 rounded-[10px] px-3 py-3 sm:px-5 sm:py-4">
      <div className="text-[11px] sm:text-[12px] font-medium text-slate-400 mb-1.5 sm:mb-2 leading-tight">{label}</div>
      <div
        className="text-[18px] sm:text-[24px] font-bold tracking-tight truncate"
        style={{ color: highlight ? "var(--color-warning)" : "white" }}
      >
        {value}
      </div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {d && (
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: d.positive ? "var(--color-success)" : "var(--color-danger)",
              background: d.positive ? "color-mix(in srgb, var(--color-success) 12%, transparent)" : "color-mix(in srgb, var(--color-danger) 12%, transparent)",
            }}
          >
            {d.label}
          </span>
        )}
        {sub && <span className="text-[11px] sm:text-[12px] text-slate-400 leading-snug">{sub}</span>}
      </div>
    </div>
  );
}
