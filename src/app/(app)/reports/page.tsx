export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const now = new Date();

  const [tradeCount, cardCount, inStockCount, stockValue, tradeRange] = await Promise.all([
    prisma.trade.count(),
    prisma.card.count(),
    prisma.card.count({ where: { status: "IN_STOCK" } }),
    prisma.card.aggregate({ where: { status: "IN_STOCK" }, _sum: { purchasePrice: true } }),
    prisma.trade.findMany({
      orderBy: { createdAt: "asc" },
      take: 1,
      select: { createdAt: true },
    }),
  ]);

  const earliestTrade = tradeRange[0]?.createdAt;
  const defaultFrom = earliestTrade
    ? earliestTrade.toISOString().split("T")[0]
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultTo = now.toISOString().split("T")[0];

  return (
    <div>
      <div className="bg-navy-900 border-b border-white/7 px-6 py-3">
        <div className="text-[15px] font-bold text-white">Reports</div>
        <div className="text-[13px] text-slate-400">Export your data to Excel or print to PDF</div>
      </div>

      <div className="p-6 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Trades", value: tradeCount.toString() },
            { label: "Total Cards", value: cardCount.toString() },
            { label: "In Stock", value: inStockCount.toString() },
            { label: "Stock Value", value: formatGBP(stockValue._sum.purchasePrice ?? 0) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-navy-800 border border-white/7 rounded-[10px] px-5 py-4">
              <div className="text-[12px] font-medium text-slate-400 mb-1">{label}</div>
              <div className="text-[22px] font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        <ReportsClient defaultFrom={defaultFrom} defaultTo={defaultTo} />
      </div>
    </div>
  );
}
