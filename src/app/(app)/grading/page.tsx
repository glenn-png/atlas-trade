export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatGBP } from "@/lib/utils";
import { Plus } from "lucide-react";

const COMPANIES: Record<string, { color: string; bg: string }> = {
  PSA:     { color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20" },
  BGS:     { color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  ACE:     { color: "text-emerald-400",bg: "bg-emerald-400/10 border-emerald-400/20" },
  MGC:     { color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  Beckett: { color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
};

function CompanyBadge({ company }: { company: string }) {
  const style = COMPANIES[company] ?? { color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20" };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${style.bg} ${style.color}`}>
      {company}
    </span>
  );
}

export default async function GradingPage() {
  const submissions = await prisma.gradingSubmission.findMany({
    include: { cards: { include: { trade: { select: { number: true } } } } },
    orderBy: { submittedAt: "desc" },
  });

  const active = submissions.filter((s) => s.status === "SUBMITTED");
  const completed = submissions.filter((s) => s.status === "RETURNED");

  const activeCards = active.reduce((s, sub) => s + sub.cards.length, 0);

  return (
    <div>
      <div className="bg-navy-900 border-b border-white/7 px-4 sm:px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white">Grading</div>
          <div className="text-[13px] text-slate-400">
            {active.length} active submission{active.length !== 1 ? "s" : ""} · {activeCards} card{activeCards !== 1 ? "s" : ""} out
          </div>
        </div>
        <Link
          href="/grading/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white text-[13px] font-semibold rounded-[8px] hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} /> Send for grading
        </Link>
      </div>

      <div className="p-4 sm:p-6 space-y-6">

        {/* Active submissions */}
        <section>
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
            Active — Out for grading ({active.length})
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
                const gradingCostSoFar = sub.cards.reduce((s, c) => s + (c.gradingCost ?? 0), 0);
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

        {/* Completed */}
        {completed.length > 0 && (
          <section>
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-3">
              Completed — Returned ({completed.length})
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
                  {completed.map((sub) => {
                    const purchaseCost = sub.cards.reduce((s, c) => s + c.purchasePrice, 0);
                    const gradingCost = sub.cards.reduce((s, c) => s + (c.gradingCost ?? 0), 0);
                    const marketValue = sub.cards.reduce((s, c) => s + (c.marketValue ?? 0), 0);
                    const pnl = marketValue - (purchaseCost + gradingCost);
                    return (
                      <tr key={sub.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3.5 py-3"><Link href={`/grading/${sub.id}`}><CompanyBadge company={sub.company} /></Link></td>
                        <td className="px-3.5 py-3 font-mono text-slate-400 text-[12px]">{sub.reference ?? "—"}</td>
                        <td className="px-3.5 py-3 text-slate-300">{sub.cards.length}</td>
                        <td className="px-3.5 py-3 text-slate-400 text-[12px]">
                          {sub.returnedAt ? new Date(sub.returnedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
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
