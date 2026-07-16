export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { Badge } from "@/components/Badge";

export default async function TradesPage() {
  const trades = await prisma.trade.findMany({
    include: { cards: { select: { purchasePrice: true, name: true } } },
    orderBy: { number: "desc" },
  });

  const totalCost = trades.reduce(
    (s, t) => s + t.cards.reduce((cs, c) => cs + c.purchasePrice, 0),
    0
  );

  return (
    <div>
      {/* Topbar */}
      <div className="bg-navy-900 border-b border-white/7 px-4 sm:px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white">Trade History</div>
          <div className="text-[13px] text-slate-400">
            {trades.length} trade{trades.length !== 1 ? "s" : ""} · {formatGBP(totalCost)} total
          </div>
        </div>
        <a
          href="/trade-in"
          className="px-3 py-2 bg-accent text-white text-[13px] font-semibold rounded-[8px] hover:bg-accent-hover transition-colors"
        >
          New trade-in
        </a>
      </div>

      <div className="p-4 sm:p-6">
        {trades.length === 0 ? (
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-16 text-center">
            <div className="text-[32px] mb-3 opacity-30">📋</div>
            <div className="text-[14px] font-semibold text-slate-400">No trades yet</div>
            <div className="text-[13px] text-slate-500 mt-1">
              <a href="/trade-in" className="text-accent">Start a trade-in →</a>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-navy-900">
                    {["Trade", "Items", "Total Cost", "Payment", "Date"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => {
                    const cost = trade.cards.reduce((s, c) => s + c.purchasePrice, 0);
                    return (
                      <tr
                        key={trade.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-3.5 py-3">
                          <a
                            href={`/trades/${trade.number}`}
                            className="font-bold text-white hover:text-accent transition-colors"
                          >
                            #{trade.number}
                          </a>
                          <div className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] truncate">
                            {trade.cards.slice(0, 2).map((c) => c.name).join(", ")}
                            {trade.cards.length > 2 ? ` +${trade.cards.length - 2}` : ""}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-300">{trade.cards.length}</td>
                        <td className="px-3.5 py-3 font-mono text-success font-semibold">{formatGBP(cost)}</td>
                        <td className="px-3.5 py-3">
                          <Badge variant={trade.paymentType === "STORE_CREDIT" ? "blue" : "slate"}>
                            {trade.paymentType === "STORE_CREDIT" ? "Store Credit" : "Purchase"}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-3 text-slate-400 text-[12px]">
                          {trade.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          <div>
                            {trade.createdAt.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {trades.map((trade) => {
                const cost = trade.cards.reduce((s, c) => s + c.purchasePrice, 0);
                const isCredit = trade.paymentType === "STORE_CREDIT";
                return (
                  <a
                    key={trade.id}
                    href={`/trades/${trade.number}`}
                    className="block bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[14px]">Trade #{trade.number}</span>
                      <span className="font-mono font-semibold text-success text-[14px]">{formatGBP(cost)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[12px] text-slate-400 truncate max-w-[200px]">
                        {trade.cards.length} item{trade.cards.length !== 1 ? "s" : ""}
                        {trade.cards.length > 0 &&
                          ` · ${trade.cards[0].name}${trade.cards.length > 1 ? ` +${trade.cards.length - 1}` : ""}`}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-semibold ${isCredit ? "text-accent" : "text-slate-400"}`}>
                          {isCredit ? "Credit" : "Purchase"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {trade.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
