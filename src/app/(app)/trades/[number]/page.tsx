export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatGBP, calcMargin } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { ArrowLeft } from "lucide-react";

export default async function TradePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const tradeNumber = parseInt(number);
  if (isNaN(tradeNumber)) notFound();

  const trade = await prisma.trade.findFirst({
    where: { number: tradeNumber },
    include: {
      cards: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!trade) notFound();

  const totalCost = trade.cards.reduce((s, c) => s + c.purchasePrice, 0);
  const totalMarket = trade.cards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
  const inStock = trade.cards.filter((c) => c.status === "IN_STOCK").length;
  const sold = trade.cards.filter((c) => c.status === "SOLD").length;

  return (
    <div>
      {/* Topbar */}
      <div className="bg-navy-900 border-b border-white/7 px-6 py-3 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white">Trade #{trade.number}</div>
          <div className="text-[13px] text-slate-400">
            {trade.createdAt.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            at{" "}
            {trade.createdAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <Badge variant={trade.paymentType === "STORE_CREDIT" ? "blue" : "slate"}>
          {trade.paymentType === "STORE_CREDIT" ? "Store Credit" : "Purchase"}
        </Badge>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-5 py-4">
            <div className="text-[12px] font-medium text-slate-400 mb-2">Cards</div>
            <div className="text-[28px] font-bold text-white">{trade.cards.length}</div>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-5 py-4">
            <div className="text-[12px] font-medium text-slate-400 mb-2">Total Cost</div>
            <div className="text-[28px] font-bold text-white">{formatGBP(totalCost)}</div>
            <div className="text-[12px] text-slate-400 mt-1">
              avg {formatGBP(totalCost / trade.cards.length)} per card
            </div>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-5 py-4">
            <div className="text-[12px] font-medium text-slate-400 mb-2">Market Value</div>
            <div className="text-[28px] font-bold text-white">
              {totalMarket > 0 ? formatGBP(totalMarket) : "—"}
            </div>
            {totalMarket > 0 && (
              <div className="text-[12px] text-success mt-1">
                {formatGBP(totalMarket - totalCost)} est. margin
              </div>
            )}
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-5 py-4">
            <div className="text-[12px] font-medium text-slate-400 mb-2">Status</div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-[28px] font-bold text-success">{inStock}</span>
              <span className="text-[14px] text-slate-400 mb-1">in stock</span>
            </div>
            {sold > 0 && (
              <div className="text-[12px] text-slate-400 mt-1">{sold} sold</div>
            )}
          </div>
        </div>

        {/* Cards table */}
        <section>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">
            Cards in this trade
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy-900">
                  {["Type", "Item", "Condition / Grade", "Purchase Price", "Market Value", "Est. Margin", "Status"].map((h) => (
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
                {trade.cards.map((card) => {
                  const ref = card.marketValue ?? card.purchasePrice;
                  const margin = calcMargin(card.purchasePrice, ref);
                  const isSold = card.status === "SOLD";

                  return (
                    <tr
                      key={card.id}
                      className={`border-b border-white/7 last:border-0 hover:bg-white/[0.02] ${isSold ? "opacity-50" : ""}`}
                    >
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {(() => {
                          const type = (card as { itemType?: string }).itemType ?? "SINGLE";
                          const map: Record<string, { label: string; emoji: string; cls: string }> = {
                            SINGLE:  { label: "Single",  emoji: "🃏", cls: "text-slate-400" },
                            GRADED:  { label: "Graded",  emoji: "🏆", cls: "text-warning" },
                            SEALED:  { label: "Sealed",  emoji: "📦", cls: "text-accent" },
                            BULK:    { label: "Bulk",    emoji: "🗂️", cls: "text-slate-300" },
                          };
                          const t = map[type] ?? map.SINGLE;
                          return (
                            <span className={`text-[11px] font-semibold ${t.cls}`}>
                              {t.emoji} {t.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-white">
                          {(card as { quantity?: number }).quantity && (card as { quantity?: number }).quantity! > 1
                            ? `${(card as { quantity?: number }).quantity}× ${card.name}`
                            : card.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {card.set}
                          {card.setNumber ? ` · #${card.setNumber}` : ""}
                          {card.rarity ? ` · ${card.rarity}` : ""}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        {(card as { itemType?: string; grade?: string }).itemType === "GRADED" && (card as { grade?: string }).grade ? (
                          <span className="text-[12px] font-semibold text-warning">
                            {(card as { grade?: string }).grade}
                          </span>
                        ) : (card as { itemType?: string }).itemType === "SEALED" ? (
                          <span className="text-slate-500 text-[12px]">—</span>
                        ) : (
                          <Badge
                            variant={card.condition === "NM" ? "green" : card.condition === "LP" ? "amber" : "red"}
                          >
                            {card.condition}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-success">
                        {formatGBP(card.purchasePrice)}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-200">
                        {card.marketValue ? formatGBP(card.marketValue) : "—"}
                      </td>
                      <td className="px-3.5 py-3">
                        {card.marketValue ? (
                          <span className="font-mono text-[12px] text-success">
                            {margin.pct.toFixed(1)}% ({formatGBP(margin.amount)})
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge
                          variant={
                            card.status === "IN_STOCK"
                              ? "green"
                              : card.status === "SOLD"
                              ? "red"
                              : "amber"
                          }
                        >
                          {card.status === "IN_STOCK"
                            ? "In Stock"
                            : card.status === "SOLD"
                            ? "Sold"
                            : "Reserved"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
