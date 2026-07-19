"use client";

import { useState, useTransition } from "react";
import { formatGBP } from "@/lib/utils";
import { createGradingSubmission } from "./actions";
import { Search, Check } from "lucide-react";

const COMPANIES = ["ACE", "MGC", "Beckett", "PSA"];

type Card = {
  id: string;
  name: string;
  set: string;
  setNumber: string | null;
  itemType: string;
  grade: string | null;
  condition: string;
  purchasePrice: number;
  marketValue: number | null;
  trade: { number: number } | null;
};

export function NewGradingClient({ cards }: { cards: Card[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [company, setCompany] = useState("PSA");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = cards.filter((c) =>
    `${c.name} ${c.set} ${c.setNumber ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return;
    startTransition(async () => {
      await createGradingSubmission({
        company,
        reference,
        notes,
        cardIds: Array.from(selected),
      });
    });
  }

  const selectedCards = cards.filter((c) => selected.has(c.id));
  const totalCost = selectedCards.reduce((s, c) => s + c.purchasePrice, 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row h-full gap-0">

      {/* Left — card picker */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:border-r border-white/7">
        <div className="max-w-2xl space-y-4">
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
            Grade worthy cards ({cards.length} available)
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or set…"
              className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[14px] pl-9 pr-4 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
            />
          </div>

          {/* Card list */}
          <div className="space-y-1.5">
            {filtered.length === 0 && (
              <div className="text-center py-8 space-y-1">
                <div className="text-slate-400 text-[13px] font-semibold">
                  {cards.length === 0 ? "No grade worthy cards in inventory" : "No cards match"}
                </div>
                {cards.length === 0 && (
                  <div className="text-slate-500 text-[12px]">Flag cards as grade worthy during a trade-in to see them here</div>
                )}
              </div>
            )}
            {filtered.map((card) => {
              const isSelected = selected.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggle(card.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-[8px] border transition-all ${
                    isSelected
                      ? "bg-accent/10 border-accent/40"
                      : "bg-navy-800 border-white/7 hover:border-white/20"
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                    isSelected ? "bg-accent border-accent" : "border-white/20"
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">{card.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {card.set}{card.setNumber ? ` · #${card.setNumber}` : ""}
                      {card.trade ? ` · Trade #${card.trade.number}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-mono text-white">{formatGBP(card.purchasePrice)}</div>
                    <div className="text-[11px] text-slate-500">{card.condition}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right — submission details */}
      <div className="w-full lg:w-[340px] shrink-0 bg-navy-900 flex flex-col">
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Submission details</div>

          {/* Company */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Grading company</div>
            <div className="grid grid-cols-2 gap-1.5">
              {COMPANIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCompany(c)}
                  className={`py-2 rounded-[8px] text-[13px] font-bold border transition-colors ${
                    company === c
                      ? "bg-accent/15 border-accent/40 text-white"
                      : "bg-navy-800 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Submission reference (optional)</div>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. PSA-2024-00123"
              className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[14px] px-4 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
            />
          </div>

          {/* Notes */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Notes (optional)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about this submission…"
              className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[14px] px-4 py-2.5 outline-none focus:border-accent placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Selected summary */}
          {selected.size > 0 && (
            <div className="bg-navy-800 border border-white/7 rounded-[8px] px-4 py-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Cards selected</span>
                <span className="text-white font-semibold">{selected.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total purchase cost</span>
                <span className="text-white font-mono">{formatGBP(totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Company</span>
                <span className="text-white font-semibold">{company}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/7">
          <button
            type="submit"
            disabled={selected.size === 0 || isPending}
            className="w-full py-3.5 bg-accent text-white font-bold text-[15px] rounded-[12px] hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Submitting…" : `Send ${selected.size > 0 ? selected.size : ""} card${selected.size !== 1 ? "s" : ""} for grading`}
          </button>
        </div>
      </div>
    </form>
  );
}
