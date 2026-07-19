export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { ArrowLeft } from "lucide-react";
import { ReturnCardModal } from "./ReturnCardModal";

const COMPANY_STYLE: Record<string, { color: string; bg: string }> = {
  PSA:     { color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
  BGS:     { color: "text-yellow-400",  bg: "bg-yellow-400/10 border-yellow-400/20" },
  ACE:     { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  MGC:     { color: "text-purple-400",  bg: "bg-purple-400/10 border-purple-400/20" },
  Beckett: { color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/20" },
};

export default async function GradingSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const submission = await prisma.gradingSubmission.findUnique({
    where: { id },
    include: {
      cards: {
        include: { trade: { select: { number: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!submission) notFound();

  const returned = submission.cards.filter((c) => c.status === "IN_STOCK" && c.gradedAt);
  const pending = submission.cards.filter((c) => c.status === "GRADING");
  const totalPurchaseCost = submission.cards.reduce((s, c) => s + c.purchasePrice, 0);
  const totalGradingCost = submission.cards.reduce((s, c) => s + (c.gradingCost ?? 0), 0);
  const totalMarket = returned.reduce((s, c) => s + (c.marketValue ?? 0), 0);
  const companyStyle = COMPANY_STYLE[submission.company] ?? { color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20" };
  const isComplete = submission.status === "RETURNED";

  return (
    <div>
      {/* Topbar */}
      <div className="bg-navy-900 border-b border-white/7 px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/grading" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-white">{submission.company} Submission</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${companyStyle.bg} ${companyStyle.color}`}>
              {submission.company}
            </span>
            {submission.reference && (
              <span className="text-[12px] font-mono text-slate-400">#{submission.reference}</span>
            )}
          </div>
          <div className="text-[13px] text-slate-400">
            Sent {new Date(submission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            {isComplete && submission.returnedAt && (
              <> · Returned {new Date(submission.returnedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</>
            )}
          </div>
        </div>
        <Badge variant={isComplete ? "green" : "amber"}>
          {isComplete ? "Returned" : `${pending.length} pending`}
        </Badge>
      </div>

      <div className="p-4 sm:p-6 space-y-6">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Cards</div>
            <div className="text-[22px] font-bold text-white">{submission.cards.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{returned.length} returned · {pending.length} pending</div>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Purchase Cost</div>
            <div className="text-[22px] font-bold text-warning">{formatGBP(totalPurchaseCost)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">original trade cost</div>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Grading Cost</div>
            <div className="text-[22px] font-bold text-white">{totalGradingCost > 0 ? formatGBP(totalGradingCost) : "—"}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">fees paid so far</div>
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-1">Market Value</div>
            <div className="text-[22px] font-bold text-success">{totalMarket > 0 ? formatGBP(totalMarket) : "—"}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">returned cards only</div>
          </div>
          {isComplete && (() => {
            const totalCost = totalPurchaseCost + totalGradingCost;
            const pnl = totalMarket - totalCost;
            return (
              <div className={`bg-navy-800 border rounded-[10px] px-4 py-3 col-span-2 sm:col-span-4 ${pnl >= 0 ? "border-success/20" : "border-danger/20"}`}>
                <div className="text-[11px] text-slate-400 mb-1">Total P&amp;L</div>
                <div className={`text-[22px] font-bold ${pnl >= 0 ? "text-success" : "text-danger"}`}>
                  {pnl >= 0 ? "+" : ""}{formatGBP(pnl)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  market {formatGBP(totalMarket)} − cost {formatGBP(totalCost)}
                </div>
              </div>
            );
          })()}
        </div>

        {submission.notes && (
          <div className="bg-navy-800 border border-white/7 rounded-[10px] px-4 py-3 text-[13px] text-slate-300 italic">
            {submission.notes}
          </div>
        )}

        {/* Cards table */}
        <section>
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
            Cards in this submission
          </div>
          <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy-900">
                  {["Card", "Origin", "Purchase Price", "Grade", "Grading Cost", "Market Value", "P&L", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submission.cards.map((card) => {
                  const isReturned = card.status === "IN_STOCK" && !!card.gradedAt;
                  return (
                    <tr key={card.id} className="border-b border-white/5 last:border-0">
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-white">{card.name}</div>
                        <div className="text-[11px] text-slate-400">{card.set}{card.setNumber ? ` · #${card.setNumber}` : ""}</div>
                      </td>
                      <td className="px-3.5 py-3 text-slate-400 text-[12px]">
                        {card.trade ? (
                          <Link href={`/trades/${card.trade.number}`} className="hover:text-accent transition-colors">
                            Trade #{card.trade.number}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-warning">{formatGBP(card.purchasePrice)}</td>
                      <td className="px-3.5 py-3">
                        {card.grade ? (
                          <span className={`text-[12px] font-bold ${companyStyle.color}`}>
                            {submission.company} {card.grade}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-300">
                        {card.gradingCost ? formatGBP(card.gradingCost) : "—"}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-success">
                        {card.marketValue ? formatGBP(card.marketValue) : "—"}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[12px]">
                        {isReturned && card.marketValue ? (() => {
                          const pnl = card.marketValue - card.purchasePrice - (card.gradingCost ?? 0);
                          return (
                            <span className={pnl >= 0 ? "text-success" : "text-danger"}>
                              {pnl >= 0 ? "+" : ""}{formatGBP(pnl)}
                            </span>
                          );
                        })() : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge variant={isReturned ? "green" : "amber"}>
                          {isReturned ? "Returned" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3">
                        {!isReturned && (
                          <ReturnCardModal
                            card={card}
                            submissionId={submission.id}
                            company={submission.company}
                          />
                        )}
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
