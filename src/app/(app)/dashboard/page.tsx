export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { ActivityChart, type Bar } from "./ActivityChart";

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

function delta(current: number, previous: number): { label: string; positive: boolean } | null {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  return { label: `${diff >= 0 ? "+" : ""}${pct}% vs prev`, positive: diff >= 0 };
}

function computeBars(trades: { createdAt: Date }[], period: Period, from: Date): Bar[] {
  if (period === "daily") {
    const hours: Bar[] = Array.from({ length: 24 }, (_, i) => ({
      label: i % 6 === 0 ? `${i}:00` : "",
      trades: 0,
    }));
    for (const t of trades) hours[t.createdAt.getHours()].trades++;
    return hours;
  }
  if (period === "weekly") {
    const days: Bar[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({ label, trades: 0 }));
    for (const t of trades) days[(t.createdAt.getDay() + 6) % 7].trades++;
    return days;
  }
  // monthly
  const daysInMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  const days: Bar[] = Array.from({ length: daysInMonth }, (_, i) => ({
    label: (i + 1) % 7 === 1 ? `${i + 1}` : "",
    trades: 0,
  }));
  for (const t of trades) {
    const d = t.createdAt.getDate() - 1;
    if (d >= 0 && d < daysInMonth) days[d].trades++;
  }
  return days;
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
  const clampedOffset = Math.min(0, offset);

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
  ] = await Promise.all([
    prisma.trade.findMany({
      where: { createdAt: { gte: current.from, lte: current.to } },
      include: { cards: { select: { purchasePrice: true, marketValue: true, name: true, paymentType: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trade.findMany({
      where: { createdAt: { gte: previous.from, lte: previous.to } },
      include: { cards: { select: { purchasePrice: true } } },
    }),
    prisma.salesDay.findMany({ where: { date: { gte: current.from, lte: current.to } } }),
    prisma.salesDay.findMany({ where: { date: { gte: previous.from, lte: previous.to } } }),
    prisma.salesDay.findMany({ where: { date: { gte: quarterStart } } }),
    prisma.card.aggregate({ where: { acquiredAt: { gte: quarterStart } }, _sum: { purchasePrice: true } }),
    prisma.card.aggregate({ where: { status: "IN_STOCK" }, _count: true, _sum: { purchasePrice: true, marketValue: true } }),
  ]);

  const currentRevenue = currentSalesDays.reduce((s, d) => s + d.msSinglesTotal, 0);
  const previousRevenue = previousSalesDays.reduce((s, d) => s + d.msSinglesTotal, 0);
  const currentCost = currentTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0), 0);
  const currentMarketValue = currentTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + (c.marketValue ?? 0), 0), 0);
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

  // Payment split for current period
  const cashTrades = currentTrades.filter((t) => t.paymentType === "CASH");
  const creditTrades = currentTrades.filter((t) => t.paymentType === "STORE_CREDIT");
  const cashCost = cashTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0), 0);
  const creditCost = creditTrades.reduce((s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0), 0);
  const splitTotal = cashCost + creditCost;
  const cashPct = splitTotal > 0 ? (cashCost / splitTotal) * 100 : 50;

  // Activity bars
  const bars = computeBars(currentTrades, period, current.from);

  // Recent trades (latest 10 in period)
  const recentTrades = currentTrades.slice(0, 10);

  const tabs: { key: Period; label: string; short: string }[] = [
    { key: "daily", label: "Daily", short: "D" },
    { key: "weekly", label: "Weekly", short: "W" },
    { key: "monthly", label: "Monthly", short: "M" },
  ];

  const periodLabel = tabs.find((t) => t.key === period)?.label ?? "Daily";

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="bg-navy-900 border-b border-white/7 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-white">Dashboard</div>
            <div className="text-[12px] text-slate-400 truncate">{label}</div>
          </div>

          {/* Period tabs */}
          <div className="flex bg-navy-800 border border-white/7 rounded-[8px] p-0.5 gap-0.5">
            {tabs.map(({ key, label: tabLabel, short }) => (
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

          {/* Prev / Today / Next */}
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
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Period overview ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>{periodLabel} Overview</SectionLabel>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Trades"
              value={currentTradeCount.toString()}
              delta={tradeDelta}
              sub={currentCardCount > 0 ? `${currentCardCount} item${currentCardCount !== 1 ? "s" : ""}` : undefined}
              accent="blue"
            />
            <StatCard
              label="Items Traded In"
              value={currentCardCount.toString()}
              delta={cardDelta}
              sub={currentTradeCount > 0 ? `across ${currentTradeCount} trade${currentTradeCount !== 1 ? "s" : ""}` : undefined}
            />
            <div className="bg-navy-800 border border-white/7 rounded-[10px] px-3 py-3 sm:px-5 sm:py-4">
              <div className="text-[11px] sm:text-[12px] font-medium text-slate-400 mb-2 leading-tight">Cost vs Market</div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Paid</span>
                  <span className="text-[16px] sm:text-[20px] font-bold font-mono" style={{ color: "var(--color-warning)" }}>
                    {formatGBP(currentCost)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Market</span>
                  <span className="text-[16px] sm:text-[20px] font-bold font-mono" style={{ color: "var(--color-success)" }}>
                    {currentMarketValue > 0 ? formatGBP(currentMarketValue) : "—"}
                  </span>
                </div>
              </div>
              {costDelta && (
                <div className="mt-1.5">
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: costDelta.positive ? "var(--color-danger)" : "var(--color-success)",
                      background: costDelta.positive
                        ? "color-mix(in srgb, var(--color-danger) 12%, transparent)"
                        : "color-mix(in srgb, var(--color-success) 12%, transparent)",
                    }}
                  >
                    {costDelta.label}
                  </span>
                </div>
              )}
            </div>
            <StatCard
              label="MS-Singles Revenue"
              value={currentRevenue > 0 ? formatGBP(currentRevenue) : "—"}
              delta={revDelta}
              sub={currentSalesDays.length > 0 ? `${currentSalesDays.length} day${currentSalesDays.length !== 1 ? "s" : ""} logged` : "No SumUp data"}
              accent="green"
            />
          </div>

          {/* Payment split bar */}
          {splitTotal > 0 && (
            <div className="mt-3 bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
              <div className="flex justify-between text-[11px] font-semibold mb-2">
                <span className="text-success">Purchase — {formatGBP(cashCost)} ({Math.round(cashPct)}%)</span>
                <span className="text-accent">Credit — {formatGBP(creditCost)} ({Math.round(100 - cashPct)}%)</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-accent/20">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${cashPct}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Activity chart ── */}
        <section>
          <SectionLabel>Activity — {periodLabel}</SectionLabel>
          <div className="mt-3 bg-navy-800 border border-white/7 rounded-[10px] px-4 pt-4 pb-3">
            <ActivityChart bars={bars} />
          </div>
        </section>

        {/* ── VAT estimate + Inventory snapshot side by side on desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionLabel>{currentQuarter} VAT Estimate</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard label="Purchases" value={formatGBP(quarterCost)} sub="from trade-ins" accent="amber" compact />
              <StatCard
                label="Sales (MS-Singles)"
                value={quarterSales > 0 ? formatGBP(quarterSales) : "—"}
                sub={quarterSalesDays.length > 0 ? `${quarterSalesDays.length} days` : "No SumUp data"}
                accent="green"
                compact
              />
              <StatCard label="Margin" value={quarterSales > 0 ? formatGBP(quarterMargin) : "—"} compact />
              <StatCard
                label="VAT Due"
                value={quarterVAT > 0 ? formatGBP(quarterVAT) : "£0.00"}
                sub="margin × 1/6"
                highlight={quarterVAT > 0}
                compact
              />
            </div>
          </section>

          <section>
            <SectionLabel>Inventory Snapshot</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard label="Cards In Stock" value={allInStock._count.toString()} compact />
              <StatCard label="Cost Value" value={formatGBP(inventoryValue)} sub="at purchase price" accent="amber" compact />
              <StatCard label="Market Value" value={formatGBP(marketValue)} sub="current market" accent="green" compact />
              <StatCard
                label="Unrealised Gain"
                value={formatGBP(marketValue - inventoryValue)}
                sub="vs purchase cost"
                accent={marketValue >= inventoryValue ? "green" : "red"}
                compact
              />
            </div>
          </section>
        </div>

        {/* ── Trade list ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>
              Trades this {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}
              {currentTradeCount > 0 && ` (${currentTradeCount})`}
            </SectionLabel>
            <a href="/trades" className="text-[12px] text-accent hover:underline">
              View all →
            </a>
          </div>

          {recentTrades.length === 0 ? (
            <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-10 text-center text-slate-400 text-[13px]">
              No trades this {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}.{" "}
              <a href="/trade-in" className="text-accent">Start a trade-in →</a>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-navy-900">
                      {["Trade", "Items", "Cost", "Payment", "Time"].map((h) => (
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
                        <tr key={trade.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-3.5 py-3">
                            <a href={`/trades/${trade.number}`} className="font-bold text-white hover:text-accent transition-colors">
                              #{trade.number}
                            </a>
                            <div className="text-[11px] text-slate-400 mt-0.5 max-w-[180px] truncate">
                              {trade.cards.slice(0, 2).map((c) => c.name).join(", ")}
                              {trade.cards.length > 2 ? ` +${trade.cards.length - 2}` : ""}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-slate-300 font-mono">{trade.cards.length}</td>
                          <td className="px-3.5 py-3 font-mono text-success font-semibold">{formatGBP(tradeCost)}</td>
                          <td className="px-3.5 py-3">
                            <Badge variant={trade.paymentType === "STORE_CREDIT" ? "blue" : "slate"}>
                              {trade.paymentType === "STORE_CREDIT" ? "Credit" : "Purchase"}
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
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {recentTrades.map((trade) => {
                  const tradeCost = trade.cards.reduce((s, c) => s + c.purchasePrice, 0);
                  const isCredit = trade.paymentType === "STORE_CREDIT";
                  return (
                    <a
                      key={trade.id}
                      href={`/trades/${trade.number}`}
                      className="block bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[14px]">Trade #{trade.number}</span>
                        <span className="font-mono font-semibold text-success text-[14px]">{formatGBP(tradeCost)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[12px] text-slate-400 truncate max-w-[200px]">
                          {trade.cards.length} item{trade.cards.length !== 1 ? "s" : ""}
                          {trade.cards.length > 0 && ` · ${trade.cards[0].name}${trade.cards.length > 1 ? ` +${trade.cards.length - 1}` : ""}`}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-semibold ${isCredit ? "text-accent" : "text-slate-400"}`}>
                            {isCredit ? "Credit" : "Purchase"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {trade.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
                {currentTradeCount > 10 && (
                  <a href="/trades" className="block text-center text-[13px] text-accent py-2">
                    +{currentTradeCount - 10} more trades — View all →
                  </a>
                )}
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400">{children}</div>
  );
}

function StatCard({
  label, value, sub, highlight, delta: d, accent, compact,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  delta?: { label: string; positive: boolean } | null;
  accent?: "blue" | "green" | "amber" | "red";
  compact?: boolean;
}) {
  const colorMap = {
    blue: "var(--color-accent)",
    green: "var(--color-success)",
    amber: "var(--color-warning)",
    red: "var(--color-danger)",
  } as const;
  const accentColor = accent ? colorMap[accent] : "white";

  return (
    <div className={`bg-navy-800 border border-white/7 rounded-[10px] ${compact ? "px-3 py-3" : "px-3 py-3 sm:px-5 sm:py-4"}`}>
      <div className={`font-medium text-slate-400 mb-1 leading-tight ${compact ? "text-[11px]" : "text-[11px] sm:text-[12px]"}`}>{label}</div>
      <div
        className={`font-bold tracking-tight truncate ${compact ? "text-[18px]" : "text-[18px] sm:text-[24px]"}`}
        style={{ color: highlight ? "var(--color-warning)" : accentColor }}
      >
        {value}
      </div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {d && (
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: d.positive ? "var(--color-success)" : "var(--color-danger)",
              background: d.positive
                ? "color-mix(in srgb, var(--color-success) 12%, transparent)"
                : "color-mix(in srgb, var(--color-danger) 12%, transparent)",
            }}
          >
            {d.label}
          </span>
        )}
        {sub && <span className="text-[11px] text-slate-400 leading-snug">{sub}</span>}
      </div>
    </div>
  );
}
