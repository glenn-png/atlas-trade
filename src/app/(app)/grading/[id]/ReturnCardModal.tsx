"use client";

import { useState, useTransition } from "react";
import { formatGBP } from "@/lib/utils";
import { returnCard } from "./actions";

type Card = {
  id: string;
  name: string;
  set: string;
  purchasePrice: number;
  marketValue: number | null;
};

export function ReturnCardModal({
  card,
  submissionId,
  company,
}: {
  card: Card;
  submissionId: string;
  company: string;
}) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("");
  const [gradingCost, setGradingCost] = useState("");
  const [marketValue, setMarketValue] = useState(card.marketValue?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grade.trim()) return;
    startTransition(async () => {
      await returnCard({
        cardId: card.id,
        submissionId,
        grade: grade.trim(),
        gradingCost: parseFloat(gradingCost) || 0,
        marketValue: parseFloat(marketValue) || 0,
      });
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-[12px] font-semibold bg-success/10 border border-success/25 text-success rounded-[6px] hover:bg-success/20 transition-colors"
      >
        Mark returned
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-navy-800 border border-white/10 rounded-[14px] w-full max-w-sm p-6 space-y-4">
            <div>
              <div className="text-[16px] font-bold text-white">Return card</div>
              <div className="text-[13px] text-slate-400 mt-0.5">{card.name}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                  {company} Grade received <span className="text-danger">*</span>
                </div>
                <input
                  type="text"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder={`e.g. ${company === "PSA" || company === "MGC" || company === "ACE" ? "10" : "9.5"}`}
                  className="w-full bg-navy-900 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
                  autoFocus
                />
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Grading cost (£)</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono">£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={gradingCost}
                    onChange={(e) => setGradingCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-navy-900 border border-white/12 rounded-[8px] text-white text-[15px] font-mono pl-8 pr-4 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Updated market value (£)</div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono">£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={marketValue}
                    onChange={(e) => setMarketValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-navy-900 border border-white/12 rounded-[8px] text-white text-[15px] font-mono pl-8 pr-4 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Purchase price was {formatGBP(card.purchasePrice)}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-[10px] text-[14px] font-semibold text-slate-300 border border-white/12 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !grade.trim()}
                  className="flex-1 py-3 rounded-[10px] text-[14px] font-bold text-white bg-success hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Confirm return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
