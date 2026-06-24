"use client";

import { useState, useTransition, useRef } from "react";
import { formatGBP } from "@/lib/utils";
import { completeTrade } from "./actions";
import { Trash2, Plus, ChevronDown, ClipboardList, PenLine } from "lucide-react";

type Condition = "NM" | "LP" | "MP" | "HP";
type PaymentType = "CASH" | "STORE_CREDIT";

interface SessionCard {
  id: string;
  name: string;
  set: string;
  setNumber: string;
  rarity: string;
  condition: Condition;
  marketValue: number;
  notes: string;
}

const CONDITIONS: Condition[] = ["NM", "LP", "MP", "HP"];

const emptyForm = {
  name: "",
  set: "",
  setNumber: "",
  rarity: "",
  condition: "NM" as Condition,
  marketValue: "",
  notes: "",
};

interface TradeInClientProps {
  defaultCashPct: number;
  defaultCreditPct: number;
  recentTrades: { id: string; number: number; cardCount: number; total: number; paymentType: string; createdAt: Date }[];
}

export function TradeInClient({ defaultCashPct, defaultCreditPct, recentTrades }: TradeInClientProps) {
  const [form, setForm] = useState(emptyForm);
  const [session, setSession] = useState<SessionCard[]>([]);
  const [cashPct, setCashPct] = useState(defaultCashPct);
  const [creditPct, setCreditPct] = useState(defaultCreditPct);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<{ count: number; total: number; type: PaymentType; tradeNumber: number } | null>(null);
  const [mobileTab, setMobileTab] = useState<"add" | "session">("add");
  const nameRef = useRef<HTMLInputElement>(null);

  const marketValue = parseFloat(form.marketValue) || 0;
  const previewCash = (marketValue * cashPct) / 100;
  const previewCredit = (marketValue * creditPct) / 100;
  const totalCash = session.reduce((s, c) => s + (c.marketValue * cashPct) / 100, 0);
  const totalCredit = session.reduce((s, c) => s + (c.marketValue * creditPct) / 100, 0);
  const totalMarket = session.reduce((s, c) => s + c.marketValue, 0);

  function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || marketValue <= 0) return;
    setSession((prev) => [...prev, { ...form, marketValue, id: crypto.randomUUID() }]);
    setForm(emptyForm);
    nameRef.current?.focus();
    // Switch to session tab on mobile after adding so they see it was added
    setMobileTab("session");
  }

  function removeCard(id: string) {
    setSession((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCardCondition(id: string, condition: Condition) {
    setSession((prev) => prev.map((c) => (c.id === id ? { ...c, condition } : c)));
  }

  function updateCardValue(id: string, marketValue: number) {
    setSession((prev) => prev.map((c) => (c.id === id ? { ...c, marketValue } : c)));
  }

  function handleAccept(paymentType: PaymentType) {
    const total = paymentType === "CASH" ? totalCash : totalCredit;
    startTransition(async () => {
      const { tradeNumber } = await completeTrade({
        paymentType,
        cards: session.map((card) => ({
          name: card.name,
          set: card.set,
          setNumber: card.setNumber,
          rarity: card.rarity,
          condition: card.condition,
          purchasePrice:
            paymentType === "CASH"
              ? (card.marketValue * cashPct) / 100
              : (card.marketValue * creditPct) / 100,
          marketValue: card.marketValue,
          notes: card.notes,
        })),
      });
      setDone({ count: session.length, total, type: paymentType, tradeNumber });
      setSession([]);
    });
  }

  if (done) {
    return (
      <div className="flex items-center justify-center h-full px-6">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-[48px]">✓</div>
          <div className="text-[13px] font-semibold text-slate-400 tracking-widest uppercase">Trade #{done.tradeNumber}</div>
          <div className="text-[22px] font-bold text-white">Trade accepted!</div>
          <div className="text-slate-400 text-[15px]">
            {done.count} card{done.count !== 1 ? "s" : ""} added for{" "}
            <span className="text-white font-semibold">{formatGBP(done.total)}</span>{" "}
            {done.type === "CASH" ? "cash" : "store credit"}
          </div>
          <button
            onClick={() => { setDone(null); setMobileTab("add"); }}
            className="mt-2 w-full px-8 py-4 bg-accent text-white font-bold text-[16px] rounded-[12px] hover:bg-accent-hover transition-colors"
          >
            New trade-in
          </button>
        </div>
      </div>
    );
  }

  // ── Shared panels ──────────────────────────────────────────────────────────

  const addCardPanel = (
    <form onSubmit={addCard} className="space-y-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Add Card</div>

      <input
        ref={nameRef}
        type="text"
        required
        autoFocus
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Card name  e.g. Charizard ex"
        className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={form.set}
          onChange={(e) => setForm({ ...form, set: e.target.value })}
          placeholder="Set"
          className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
        />
        <input
          type="text"
          value={form.setNumber}
          onChange={(e) => setForm({ ...form, setNumber: e.target.value })}
          placeholder="Number"
          className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value as Condition })}
            className="w-full appearance-none bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent cursor-pointer pr-8"
          >
            <option value="NM">Near Mint (NM)</option>
            <option value="LP">Lightly Played (LP)</option>
            <option value="MP">Moderately Played (MP)</option>
            <option value="HP">Heavily Played (HP)</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[15px]">£</span>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.marketValue}
            onChange={(e) => setForm({ ...form, marketValue: e.target.value })}
            placeholder="Value"
            className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] font-mono pl-8 pr-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
          />
        </div>
      </div>

      {marketValue > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-navy-900 rounded-[8px] px-4 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Cash</div>
            <div className="text-[20px] font-extrabold text-white font-mono">{formatGBP(previewCash)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{cashPct}%</div>
          </div>
          <div className="bg-accent/10 border border-accent/20 rounded-[8px] px-4 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-1">Credit</div>
            <div className="text-[20px] font-extrabold text-white font-mono">{formatGBP(previewCredit)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{creditPct}%</div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!form.name.trim() || marketValue <= 0}
        className="w-full flex items-center justify-center gap-2 bg-navy-700 border border-white/12 text-white font-semibold text-[15px] py-3.5 rounded-[12px] hover:bg-navy-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={16} /> Add to session
      </button>
    </form>
  );

  const sessionPanel = (
    <>
      {session.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div>
            <div className="text-[32px] mb-3 opacity-30">📋</div>
            <div className="text-[14px] font-semibold text-slate-400">Session is empty</div>
            <div className="text-[12px] text-slate-500 mt-1">Add cards using the form</div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <div className="px-4 pt-4 pb-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Session — {session.length} card{session.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="divide-y divide-white/7">
              {session.map((card) => {
                const cashOffer = (card.marketValue * cashPct) / 100;
                const creditOffer = (card.marketValue * creditPct) / 100;
                return (
                  <div key={card.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-white truncate">{card.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {card.set}{card.setNumber ? ` · #${card.setNumber}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => removeCard(card.id)}
                        className="text-slate-500 hover:text-danger transition-all shrink-0 mt-0.5 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex gap-1">
                        {CONDITIONS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateCardCondition(card.id, c)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                              card.condition === c
                                ? c === "NM" ? "bg-success/20 text-success"
                                  : c === "LP" ? "bg-warning/20 text-warning"
                                  : "bg-danger/20 text-danger"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <div className="relative ml-auto">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]">£</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={card.marketValue}
                          onChange={(e) => updateCardValue(card.id, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-navy-800 border border-white/10 rounded text-white text-[12px] font-mono pl-5 pr-2 py-1 outline-none focus:border-accent text-right"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-1.5 text-[11px]">
                      <span className="text-slate-500">Cash {formatGBP(cashOffer)}</span>
                      <span className="text-accent">Credit {formatGBP(creditOffer)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/7 p-4 space-y-3 bg-navy-800">
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Market total</span>
                <span className="text-white font-mono">{formatGBP(totalMarket)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cash ({cashPct}%)</span>
                <span className="text-white font-mono font-semibold">{formatGBP(totalCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credit ({creditPct}%)</span>
                <span className="text-accent font-mono font-semibold">{formatGBP(totalCredit)}</span>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleAccept("CASH")}
                disabled={isPending}
                className="w-full bg-success text-white font-bold text-[16px] py-4 rounded-[12px] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                ✓ Accept Cash — {formatGBP(totalCash)}
              </button>
              <button
                onClick={() => handleAccept("STORE_CREDIT")}
                disabled={isPending}
                className="w-full bg-accent text-white font-bold text-[16px] py-4 rounded-[12px] hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                ✓ Accept Credit — {formatGBP(totalCredit)}
              </button>
              <button
                onClick={() => setSession([])}
                className="w-full text-slate-500 text-[13px] py-2 hover:text-white transition-colors"
              >
                Clear session
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="bg-navy-900 border-b border-white/7 px-4 lg:px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white">Trade-In</div>
          <div className="text-[13px] text-slate-400">
            {session.length === 0 ? "Add cards to the session" : `${session.length} card${session.length !== 1 ? "s" : ""} in session`}
          </div>
        </div>
        {/* Offer % controls */}
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <span className="hidden sm:inline">Cash</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={cashPct}
              onChange={(e) => setCashPct(parseFloat(e.target.value) || 0)}
              className="w-11 bg-navy-800 border border-white/12 rounded text-white text-[12px] font-mono px-1.5 py-1 text-right outline-none focus:border-accent"
            />
            <span>%</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">Credit</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={creditPct}
              onChange={(e) => setCreditPct(parseFloat(e.target.value) || 0)}
              className="w-11 bg-navy-800 border border-white/12 rounded text-white text-[12px] font-mono px-1.5 py-1 text-right outline-none focus:border-accent"
            />
            <span>%</span>
          </div>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden flex border-b border-white/7 bg-navy-900 shrink-0">
        <button
          onClick={() => setMobileTab("add")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-colors border-b-2 ${
            mobileTab === "add"
              ? "text-white border-accent"
              : "text-slate-400 border-transparent"
          }`}
        >
          <PenLine size={14} /> Add Card
        </button>
        <button
          onClick={() => setMobileTab("session")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-colors border-b-2 ${
            mobileTab === "session"
              ? "text-white border-accent"
              : "text-slate-400 border-transparent"
          }`}
        >
          <ClipboardList size={14} />
          Session
          {session.length > 0 && (
            <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {session.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden flex-1 overflow-auto flex flex-col">
        {mobileTab === "add" ? (
          <div className="p-4 flex-1 overflow-auto">
            {addCardPanel}
            {recentTrades.length > 0 && session.length === 0 && (
              <div className="mt-8">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent trades</div>
                <div className="space-y-1.5">
                  {recentTrades.map((t) => (
                    <a
                      key={t.id}
                      href={`/trades/${t.number}`}
                      className="flex items-center justify-between bg-navy-800 border border-white/7 rounded-[6px] px-3 py-2 text-[12px] hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Trade #{t.number}</span>
                        <span className="text-slate-400">{t.cardCount} card{t.cardCount !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="font-mono text-white">{formatGBP(t.total)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-navy-900">
            {sessionPanel}
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-6 border-r border-white/7">
          {addCardPanel}
          {recentTrades.length > 0 && session.length === 0 && (
            <div className="mt-8">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent trades</div>
              <div className="space-y-1.5">
                {recentTrades.map((t) => (
                  <a
                    key={t.id}
                    href={`/trades/${t.number}`}
                    className="flex items-center justify-between bg-navy-800 border border-white/7 rounded-[6px] px-3 py-2 text-[12px] hover:border-white/20 hover:bg-navy-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Trade #{t.number}</span>
                      <span className="text-slate-400">{t.cardCount} card{t.cardCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-mono text-white">{formatGBP(t.total)}</span>
                      <span>{t.paymentType === "STORE_CREDIT" ? "credit" : "cash"}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="w-[380px] shrink-0 flex flex-col bg-navy-900">
          {sessionPanel}
        </div>
      </div>
    </div>
  );
}
