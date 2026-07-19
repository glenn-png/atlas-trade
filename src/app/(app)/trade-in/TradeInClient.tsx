"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { formatGBP } from "@/lib/utils";
import { completeTrade } from "./actions";
import { Trash2, Plus, ChevronDown, ClipboardList, PenLine } from "lucide-react";

type ItemType = "SINGLE" | "GRADED" | "SEALED" | "BULK";
type Condition = "NM" | "LP" | "MP" | "HP";
type PaymentType = "CASH" | "STORE_CREDIT";

interface SessionCard {
  id: string;
  itemType: ItemType;
  name: string;
  set: string;
  setNumber: string;
  rarity: string;
  condition: Condition;
  grade: string;
  quantity: number;
  marketValue: number; // per unit
  notes: string;
  gradeWorthy: boolean;
}

const CONDITIONS: Condition[] = ["NM", "LP", "MP", "HP"];

const ITEM_TYPES: { value: ItemType; label: string; emoji: string }[] = [
  { value: "SINGLE", label: "Single", emoji: "🃏" },
  { value: "GRADED", label: "Graded", emoji: "🏆" },
  { value: "SEALED", label: "Sealed", emoji: "📦" },
  { value: "BULK", label: "Bulk", emoji: "🗂️" },
];

const CONGRATS: { emoji: string; message: string }[] = [
  { emoji: "⚡", message: "Pikachu used Trade-In! It's super effective!" },
  { emoji: "🔥", message: "Charizard is fired up — great trade!" },
  { emoji: "💧", message: "Blastoise gives this trade two thumbs up!" },
  { emoji: "🌿", message: "Bulbasaur bloomed with joy at this trade!" },
  { emoji: "🌙", message: "Umbreon approves. You traded in the dark type way." },
  { emoji: "✨", message: "A wild Clefairy appeared — and it loved this trade!" },
  { emoji: "🏆", message: "Mewtwo sensed incredible power in this transaction." },
  { emoji: "🎯", message: "Alakazam calculated it — this was the optimal trade." },
  { emoji: "🌊", message: "Gyarados is pleased. Do not make it unpleased." },
  { emoji: "🍃", message: "Snorlax woke up just to say: nice trade, back to sleep." },
  { emoji: "❄️", message: "Articuno froze time to celebrate this trade!" },
  { emoji: "🌟", message: "Jolteon sparked with excitement — stellar trade!" },
  { emoji: "🦋", message: "Butterfree fluttered in to say you absolutely nailed it." },
  { emoji: "🎵", message: "Jigglypuff sang a victory song just for you!" },
  { emoji: "👊", message: "Machamp is giving you all four thumbs up!" },
  { emoji: "🔮", message: "Gengar is grinning — and Gengar only grins at good trades." },
  { emoji: "🌈", message: "Ho-Oh descended from the heavens to witness this trade." },
  { emoji: "🐉", message: "Dragonite flew across the world to deliver this congrats!" },
  { emoji: "🔴", message: "Professor Oak said: Outstanding! A fine trade was made today." },
  { emoji: "💫", message: "Eevee doesn't know which form to evolve into — this trade was too hype!" },
  { emoji: "🌺", message: "Vileplume bloomed with pride at your trading skills!" },
  { emoji: "🧲", message: "Magneton was attracted to this trade from three routes away." },
  { emoji: "👁️", message: "Alakazam had a vision of this trade. It was glorious." },
  { emoji: "🌀", message: "Gastly, Haunter, and Gengar all clapped. That's six hands." },
  { emoji: "🏄", message: "Lapras surfed all the way here to say: incredible trade." },
  { emoji: "⚙️", message: "Registeel approved. And Registeel approves of very little." },
  { emoji: "🍄", message: "Foongus disguised itself as a Poké Ball just to celebrate this one." },
  { emoji: "🦊", message: "Ninetales has seen a thousand trades. This one made the list." },
  { emoji: "🪨", message: "Geodude gave you a thumbs up. Both of them. It's all thumbs." },
  { emoji: "🌙", message: "Lunala crossed dimensions to witness this legendary trade." },
  { emoji: "🎪", message: "Mr. Mime put on a full mime performance — a standing ovation for you." },
  { emoji: "🐘", message: "Phanpy did a little roll to celebrate. It's the highest honour." },
  { emoji: "🐷", message: "Lechonk sniffed this trade and deemed it absolutely top tier." },
];

const emptyForm = {
  itemType: "SINGLE" as ItemType,
  name: "",
  set: "",
  setNumber: "",
  rarity: "",
  condition: "NM" as Condition,
  grade: "",
  quantity: "1",
  marketValue: "",
  notes: "",
  gradeWorthy: false,
};

interface TradeInClientProps {
  defaultCashPct: number;
  defaultCreditPct: number;
  recentTrades: { id: string; number: number; cardCount: number; total: number; paymentType: string; createdAt: Date }[];
}

function itemLabel(card: SessionCard): string {
  if (card.itemType === "BULK") return `${card.quantity}× ${card.name}`;
  if (card.itemType === "SEALED") return card.quantity > 1 ? `${card.quantity}× ${card.name}` : card.name;
  return card.name;
}

function itemSub(card: SessionCard): string {
  if (card.itemType === "GRADED") return `${card.set} · ${card.grade || "Graded"}`;
  if (card.itemType === "SEALED") return card.set;
  if (card.itemType === "BULK") return card.set ? `${card.set} · ${formatGBP(card.marketValue)} each` : `${formatGBP(card.marketValue)} each`;
  return `${card.set}${card.setNumber ? ` · #${card.setNumber}` : ""}`;
}

function itemTypeBadge(type: ItemType) {
  const map: Record<ItemType, string> = {
    SINGLE: "text-slate-400",
    GRADED: "text-warning",
    SEALED: "text-accent",
    BULK: "text-slate-300",
  };
  const labels: Record<ItemType, string> = { SINGLE: "", GRADED: "Graded", SEALED: "Sealed", BULK: "Bulk" };
  if (type === "SINGLE") return null;
  return <span className={`text-[10px] font-bold uppercase tracking-wider ${map[type]}`}>{labels[type]}</span>;
}

export function TradeInClient({ defaultCashPct, defaultCreditPct, recentTrades }: TradeInClientProps) {
  const [form, setForm] = useState(emptyForm);
  const [session, setSession] = useState<SessionCard[]>([]);
  const [cashPct, setCashPct] = useState(defaultCashPct);
  const [creditPct, setCreditPct] = useState(defaultCreditPct);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<{ count: number; total: number; type: PaymentType; tradeNumber: number; congrats: { emoji: string; message: string } } | null>(null);
  const [mobileTab, setMobileTab] = useState<"add" | "session">("add");
  const [confirmAccept, setConfirmAccept] = useState<{ paymentType: PaymentType; total: number } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Load persisted session after mount to avoid SSR/client mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("atlas-trade-in-session");
      if (saved) setSession(JSON.parse(saved) as SessionCard[]);
    } catch {}
  }, []);

  // Persist session to localStorage on every change
  useEffect(() => {
    try {
      if (session.length === 0) {
        localStorage.removeItem("atlas-trade-in-session");
      } else {
        localStorage.setItem("atlas-trade-in-session", JSON.stringify(session));
      }
    } catch {}
  }, [session]);

  const marketValue = parseFloat(form.marketValue) || 0;
  const quantity = parseInt(form.quantity) || 1;
  const previewCash = (marketValue * cashPct) / 100;
  const previewCredit = (marketValue * creditPct) / 100;

  // Session totals — scale by quantity for bulk/sealed
  const totalCash = session.reduce((s, c) => s + (c.marketValue * cashPct / 100) * c.quantity, 0);
  const totalCredit = session.reduce((s, c) => s + (c.marketValue * creditPct / 100) * c.quantity, 0);
  const totalMarket = session.reduce((s, c) => s + c.marketValue * c.quantity, 0);

  function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || marketValue <= 0) return;
    setSession((prev) => [...prev, {
      ...form,
      marketValue,
      quantity: parseInt(form.quantity) || 1,
      id: crypto.randomUUID(),
    }]);
    setForm((prev) => ({ ...emptyForm, itemType: prev.itemType }));
    nameRef.current?.focus();
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
    setConfirmAccept({ paymentType, total });
  }

  function confirmAndSubmit() {
    if (!confirmAccept) return;
    const { paymentType } = confirmAccept;
    setConfirmAccept(null);
    startTransition(async () => {
      const { tradeNumber } = await completeTrade({
        paymentType,
        cards: session.map((card) => ({
          itemType: card.itemType,
          name: card.name,
          set: card.set,
          setNumber: card.setNumber,
          rarity: card.rarity,
          condition: card.condition,
          grade: card.grade,
          quantity: card.quantity,
          purchasePrice: paymentType === "CASH"
            ? (card.marketValue * cashPct / 100) * card.quantity
            : (card.marketValue * creditPct / 100) * card.quantity,
          marketValue: card.marketValue * card.quantity,
          notes: card.notes,
          gradeWorthy: card.gradeWorthy,
        })),
      });
      const total = paymentType === "CASH" ? totalCash : totalCredit;
      const congrats = CONGRATS[Math.floor(Math.random() * CONGRATS.length)];
      setDone({ count: session.length, total, type: paymentType, tradeNumber, congrats });
      setSession([]);
    });
  }

  if (done) {
    return (
      <div className="flex items-center justify-center h-full px-6">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-[56px]">{done.congrats.emoji}</div>
          <div className="text-[13px] font-semibold text-slate-400 tracking-widest uppercase">Trade #{done.tradeNumber}</div>
          <div className="text-[22px] font-bold text-white">Trade accepted!</div>
          <div className="bg-accent/10 border border-accent/20 rounded-[12px] px-5 py-4">
            <div className="text-[15px] text-white font-medium italic">"{done.congrats.message}"</div>
          </div>
          <div className="text-slate-400 text-[15px]">
            {done.count} item{done.count !== 1 ? "s" : ""} added for{" "}
            <span className="text-white font-semibold">{formatGBP(done.total)}</span>{" "}
            {done.type === "CASH" ? "purchase" : "store credit"}
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

  // ── Add item form ──────────────────────────────────────────────────────────

  const addCardPanel = (
    <form onSubmit={addCard} className="space-y-3.5">
      {/* Type selector */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Item type</div>
        <div className="grid grid-cols-4 gap-1.5">
          {ITEM_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...emptyForm, itemType: value })}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-[8px] text-[11px] font-semibold border transition-colors ${
                form.itemType === value
                  ? "bg-accent/15 border-accent/40 text-white"
                  : "bg-navy-800 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              }`}
            >
              <span className="text-[16px]">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Name / description */}
      <input
        ref={nameRef}
        type="text"
        required
        autoFocus
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder={
          form.itemType === "SEALED" ? "Product name  e.g. Scarlet & Violet Booster Box"
          : form.itemType === "BULK" ? "Description  e.g. Common / Uncommon mix"
          : "Card name  e.g. Charizard ex"
        }
        className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
      />

      {/* Set (all types) */}
      <input
        type="text"
        required={form.itemType !== "BULK"}
        value={form.set}
        onChange={(e) => setForm({ ...form, set: e.target.value })}
        placeholder={form.itemType === "BULK" ? "Set / source (optional)" : "Set  e.g. Obsidian Flames"}
        className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
      />

      {/* Single: set number + rarity */}
      {form.itemType === "SINGLE" && (
        <input
          type="text"
          value={form.setNumber}
          onChange={(e) => setForm({ ...form, setNumber: e.target.value })}
          placeholder="Number  e.g. 215/197"
          className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
        />
      )}

      {/* Graded: grade input */}
      {form.itemType === "GRADED" && (
        <input
          type="text"
          required
          value={form.grade}
          onChange={(e) => setForm({ ...form, grade: e.target.value })}
          placeholder="Grade  e.g. PSA 10, BGS 9.5, CGC 9"
          className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
        />
      )}

      {/* Condition (single + bulk) */}
      {(form.itemType === "SINGLE" || form.itemType === "BULK") && (
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
      )}

      {/* Quantity (bulk + sealed) */}
      {(form.itemType === "BULK" || form.itemType === "SEALED") && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Quantity</div>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="1"
              className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] font-mono px-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
            />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              {form.itemType === "BULK" ? "Market value each (£)" : "Market value (£)"}
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
                placeholder="0.00"
                className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] font-mono pl-8 pr-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Market value (single + graded — no quantity) */}
      {(form.itemType === "SINGLE" || form.itemType === "GRADED") && (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[15px]">£</span>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.marketValue}
            onChange={(e) => setForm({ ...form, marketValue: e.target.value })}
            placeholder="Market value"
            className="w-full bg-navy-800 border border-white/12 rounded-[8px] text-white text-[15px] font-mono pl-8 pr-4 py-3 outline-none focus:border-accent placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Offer preview */}
      {marketValue > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-navy-900 rounded-[8px] px-4 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Purchase</div>
            <div className="text-[20px] font-extrabold text-white font-mono">
              {formatGBP(previewCash * (form.itemType === "BULK" || form.itemType === "SEALED" ? quantity : 1))}
            </div>
            {(form.itemType === "BULK" || form.itemType === "SEALED") && quantity > 1 && (
              <div className="text-[11px] text-slate-500 mt-0.5">{formatGBP(previewCash)} × {quantity}</div>
            )}
            <div className="text-[11px] text-slate-500 mt-0.5">{cashPct}%</div>
          </div>
          <div className="bg-accent/10 border border-accent/20 rounded-[8px] px-4 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-1">Credit</div>
            <div className="text-[20px] font-extrabold text-white font-mono">
              {formatGBP(previewCredit * (form.itemType === "BULK" || form.itemType === "SEALED" ? quantity : 1))}
            </div>
            {(form.itemType === "BULK" || form.itemType === "SEALED") && quantity > 1 && (
              <div className="text-[11px] text-slate-500 mt-0.5">{formatGBP(previewCredit)} × {quantity}</div>
            )}
            <div className="text-[11px] text-slate-500 mt-0.5">{creditPct}%</div>
          </div>
        </div>
      )}

      {/* Grade worthy flag — singles only */}
      {form.itemType === "SINGLE" && (
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-colors ${
            form.gradeWorthy
              ? "bg-amber-500/20 border-amber-500"
              : "bg-navy-800 border-white/20 group-hover:border-white/40"
          }`}>
            {form.gradeWorthy && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={form.gradeWorthy}
            onChange={(e) => setForm({ ...form, gradeWorthy: e.target.checked })}
          />
          <div>
            <div className="text-[13px] font-semibold text-slate-300 group-hover:text-white transition-colors">
              Grade worthy 🏆
            </div>
            <div className="text-[11px] text-slate-500">Flag for grading submission</div>
          </div>
        </label>
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

  // ── Session panel ──────────────────────────────────────────────────────────

  const sessionPanel = (
    <>
      {session.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div>
            <div className="text-[32px] mb-3 opacity-30">📋</div>
            <div className="text-[14px] font-semibold text-slate-400">Session is empty</div>
            <div className="text-[12px] text-slate-500 mt-1">Add items using the form</div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <div className="px-4 pt-4 pb-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Session — {session.length} item{session.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="divide-y divide-white/7">
              {session.map((card) => {
                const cashOffer = (card.marketValue * cashPct / 100) * card.quantity;
                const creditOffer = (card.marketValue * creditPct / 100) * card.quantity;
                return (
                  <div key={card.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-white truncate">{itemLabel(card)}</span>
                          {itemTypeBadge(card.itemType)}
                          {card.gradeWorthy && (
                            <span className="text-[10px] font-bold text-amber-400">🏆 Grade worthy</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{itemSub(card)}</div>
                      </div>
                      <button
                        onClick={() => removeCard(card.id)}
                        className="text-slate-500 hover:text-danger transition-all shrink-0 mt-0.5 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {(card.itemType === "SINGLE" || card.itemType === "BULK") && (
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
                    )}

                    {(card.itemType === "GRADED" || card.itemType === "SEALED") && (
                      <div className="flex justify-end mt-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]">£</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={card.marketValue}
                            onChange={(e) => updateCardValue(card.id, parseFloat(e.target.value) || 0)}
                            className="w-24 bg-navy-800 border border-white/10 rounded text-white text-[12px] font-mono pl-5 pr-2 py-1 outline-none focus:border-accent text-right"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between mt-1.5 text-[11px]">
                      <span className="text-slate-500">Purchase {formatGBP(cashOffer)}</span>
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
                <span className="text-slate-400">Purchase ({cashPct}%)</span>
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
                ✓ Accept Purchase — {formatGBP(totalCash)}
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
    <>
      {/* Confirm modal */}
      {confirmAccept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-navy-800 border border-white/10 rounded-[14px] w-full max-w-sm p-6 space-y-4">
            <div className="text-[16px] font-bold text-white">Confirm trade?</div>
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Items</span>
                <span className="text-white font-semibold">{session.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment</span>
                <span className="text-white font-semibold">{confirmAccept.paymentType === "CASH" ? "Purchase" : "Store Credit"}</span>
              </div>
              <div className="flex justify-between text-[15px] pt-1 border-t border-white/7 mt-2">
                <span className="text-slate-300 font-semibold">Total</span>
                <span className="text-white font-bold font-mono">{formatGBP(confirmAccept.total)}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmAccept(null)}
                className="flex-1 py-3 rounded-[10px] text-[14px] font-semibold text-slate-300 border border-white/12 hover:text-white hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndSubmit}
                disabled={isPending}
                className={`flex-1 py-3 rounded-[10px] text-[14px] font-bold text-white transition-opacity disabled:opacity-50 ${
                  confirmAccept.paymentType === "CASH" ? "bg-success hover:opacity-90" : "bg-accent hover:opacity-90"
                }`}
              >
                {isPending ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Topbar */}
        <div className="bg-navy-900 border-b border-white/7 px-4 lg:px-6 py-3 flex items-center gap-4 shrink-0">
          <div className="flex-1">
            <div className="text-[15px] font-bold text-white">Trade-In</div>
            <div className="text-[13px] text-slate-400">
              {session.length === 0 ? "Add items to the session" : `${session.length} item${session.length !== 1 ? "s" : ""} in session`}
            </div>
          </div>
          {/* Offer % controls */}
          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            <span className="hidden sm:inline">Purchase</span>
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
              mobileTab === "add" ? "text-white border-accent" : "text-slate-400 border-transparent"
            }`}
          >
            <PenLine size={14} /> Add Item
          </button>
          <button
            onClick={() => setMobileTab("session")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-colors border-b-2 ${
              mobileTab === "session" ? "text-white border-accent" : "text-slate-400 border-transparent"
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

        {/* Mobile layout */}
        <div className="lg:hidden flex-1 overflow-auto flex flex-col">
          {mobileTab === "add" ? (
            <div className="p-4 flex-1 overflow-auto">
              {addCardPanel}
              {recentTrades.length > 0 && session.length === 0 && (
                <div className="mt-8">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent trades ({recentTrades.length})</div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {recentTrades.map((t) => (
                      <a
                        key={t.id}
                        href={`/trades/${t.number}`}
                        className="flex items-center justify-between bg-navy-800 border border-white/7 rounded-[6px] px-3 py-2 text-[12px] hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Trade #{t.number}</span>
                          <span className="text-slate-400">{t.cardCount} item{t.cardCount !== 1 ? "s" : ""}</span>
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

        {/* Desktop layout */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-6 border-r border-white/7">
            {addCardPanel}
            {recentTrades.length > 0 && session.length === 0 && (
              <div className="mt-8">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent trades ({recentTrades.length})</div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {recentTrades.map((t) => (
                    <a
                      key={t.id}
                      href={`/trades/${t.number}`}
                      className="flex items-center justify-between bg-navy-800 border border-white/7 rounded-[6px] px-3 py-2 text-[12px] hover:border-white/20 hover:bg-navy-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Trade #{t.number}</span>
                        <span className="text-slate-400">{t.cardCount} item{t.cardCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="font-mono text-white">{formatGBP(t.total)}</span>
                        <span>{t.paymentType === "STORE_CREDIT" ? "credit" : "purchase"}</span>
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
    </>
  );
}
