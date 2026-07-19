"use client";

import { useState, useTransition } from "react";
import { formatGBP, calcMargin } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { markAsSold, addCard, toggleGradeWorthy } from "./actions";
import { Plus, CheckCircle, Eye } from "lucide-react";

type Condition = "NM" | "LP" | "MP" | "HP";
type CardStatus = "IN_STOCK" | "SOLD" | "RESERVED" | "GRADING";

interface Card {
  id: string;
  name: string;
  set: string;
  setNumber: string | null;
  rarity: string | null;
  condition: Condition;
  purchasePrice: number;
  marketValue: number | null;
  salePrice: number | null;
  status: CardStatus;
  paymentType: string | null;
  gradeWorthy: boolean;
  trade: { number: number } | null;
}

interface InventoryClientProps {
  cards: Card[];
  total: number;
  inStockCount: number;
  stockValue: number;
  page: number;
  perPage: number;
  q: string;
  statusFilter: string;
  conditionFilter: string;
}

const emptyAddForm = {
  name: "",
  set: "",
  setNumber: "",
  rarity: "",
  condition: "NM" as Condition,
  purchasePrice: "",
  marketValue: "",
};

export function InventoryClient({
  cards,
  total,
  inStockCount,
  stockValue,
  page,
  perPage,
  q,
  statusFilter,
  conditionFilter,
}: InventoryClientProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [isPending, startTransition] = useTransition();
  const [justSold, setJustSold] = useState<string | null>(null);
  const totalPages = Math.ceil(total / perPage);

  function handleMarkSold(card: Card) {
    startTransition(async () => {
      await markAsSold({ cardId: card.id });
      setJustSold(card.name);
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addCard({
        name: addForm.name,
        set: addForm.set,
        setNumber: addForm.setNumber,
        rarity: addForm.rarity,
        condition: addForm.condition,
        purchasePrice: parseFloat(addForm.purchasePrice) || 0,
        marketValue: addForm.marketValue ? parseFloat(addForm.marketValue) : undefined,
        notes: "",
      });
      setShowAdd(false);
      setAddForm(emptyAddForm);
    });
  }

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      q,
      status: statusFilter,
      condition: conditionFilter,
      page: page.toString(),
      ...overrides,
    });
    return `?${params}`;
  }

  return (
    <>
      {/* Topbar */}
      <div className="bg-navy-900 border-b border-white/7 px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white">Inventory</div>
          <div className="text-[13px] text-slate-400">
            {inStockCount} cards in stock · {formatGBP(stockValue)} stock value
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-[12px] font-semibold rounded-[6px] hover:bg-accent-hover transition-colors"
        >
          <Plus size={13} /> Add card
        </button>
      </div>

      {justSold && (
        <div className="mx-6 mt-4 bg-success/12 border border-success/30 rounded-[6px] px-4 py-2.5 flex items-center justify-between text-[13px]">
          <span className="text-success font-semibold">✓ {justSold} marked as sold</span>
          <button onClick={() => setJustSold(null)} className="text-slate-400 hover:text-white text-[11px]">dismiss</button>
        </div>
      )}

      <div className="p-4 px-6">
        {/* Filters */}
        <form method="get" className="flex gap-2.5 mb-4 flex-wrap items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search cards…"
            className="flex-1 min-w-[200px] bg-navy-800 border border-white/12 rounded-[6px] text-white text-[13px] px-3 py-2 outline-none focus:border-accent placeholder:text-slate-400"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="bg-navy-800 border border-white/12 rounded-[6px] text-slate-200 text-[13px] px-3.5 py-2 outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="SOLD">Sold</option>
            <option value="RESERVED">Reserved</option>
          </select>
          <select
            name="condition"
            defaultValue={conditionFilter}
            className="bg-navy-800 border border-white/12 rounded-[6px] text-slate-200 text-[13px] px-3.5 py-2 outline-none cursor-pointer"
          >
            <option value="">All Conditions</option>
            <option value="NM">NM</option>
            <option value="LP">LP</option>
            <option value="MP">MP</option>
            <option value="HP">HP</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-navy-700 text-white text-[13px] font-semibold rounded-[6px] border border-white/12 hover:bg-navy-600 transition-colors"
          >
            Filter
          </button>
          <div className="text-[12px] text-slate-400">{total} results</div>
        </form>

        {/* Table */}
        <div className="bg-navy-800 border border-white/7 rounded-[10px] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-navy-900">
                {["Trade", "Card", "Condition", "Purchase Price", "Market Value", "Est. Margin", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400 border-b border-white/7 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No cards found.{" "}
                    {total === 0 && (
                      <button onClick={() => setShowAdd(true)} className="text-accent underline">
                        Add your first card →
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                cards.map((card) => {
                  const ref = card.marketValue ?? card.purchasePrice;
                  const margin = calcMargin(card.purchasePrice, ref);
                  const sold = card.status === "SOLD";

                  return (
                    <tr
                      key={card.id}
                      className={`border-b border-white/7 last:border-0 hover:bg-white/[0.02] ${sold ? "opacity-50" : ""}`}
                    >
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {card.trade ? (
                          <a
                            href={`/trades/${card.trade.number}`}
                            className="text-[11px] font-bold text-slate-400 bg-navy-900 border border-white/7 px-2 py-0.5 rounded hover:text-accent hover:border-accent/30 transition-colors"
                          >
                            #{card.trade.number}
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[12px]">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-white">{card.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {card.set}
                          {card.setNumber ? ` · #${card.setNumber}` : ""}
                          {card.rarity ? ` · ${card.rarity}` : ""}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge variant={card.condition === "NM" ? "green" : card.condition === "LP" ? "amber" : "red"}>
                          {card.condition}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-200">{formatGBP(card.purchasePrice)}</td>
                      <td className="px-3.5 py-3 font-mono text-success">
                        {card.marketValue ? formatGBP(card.marketValue) : "—"}
                      </td>
                      <td className="px-3.5 py-3">
                        {card.marketValue ? (
                          <span className="font-mono text-[12px] text-success">
                            {margin.pct.toFixed(1)}% ({formatGBP(margin.amount)})
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge variant={card.status === "IN_STOCK" ? "green" : card.status === "SOLD" ? "red" : "amber"}>
                          {card.status === "IN_STOCK" ? "In Stock" : card.status === "SOLD" ? "Sold" : "Reserved"}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          {card.status === "IN_STOCK" && (
                            <button
                              onClick={() => startTransition(() => toggleGradeWorthy({ cardId: card.id, gradeWorthy: !card.gradeWorthy }))}
                              disabled={isPending}
                              title={card.gradeWorthy ? "Remove grade worthy flag" : "Flag as grade worthy"}
                              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-[6px] border transition-colors disabled:opacity-40 ${
                                card.gradeWorthy
                                  ? "text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                                  : "text-slate-400 border-white/7 hover:text-amber-400 hover:border-amber-500/30"
                              }`}
                            >
                              🏆
                            </button>
                          )}
                          {!sold ? (
                            <button
                              onClick={() => handleMarkSold(card)}
                              disabled={isPending}
                              title="Mark as sold"
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-white/7 rounded-[6px] hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
                            >
                              <CheckCircle size={11} /> Sold
                            </button>
                          ) : (
                            <div className="w-[26px] h-[26px] flex items-center justify-center text-slate-600">
                              <Eye size={12} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-white/7 flex items-center justify-between">
              <div className="text-[12px] text-slate-400">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </div>
              <div className="flex gap-1">
                {page > 1 && (
                  <a href={buildUrl({ page: String(page - 1) })}
                    className="px-3 py-1.5 text-[12px] text-slate-300 border border-white/7 rounded-[6px] hover:text-white">
                    ← Prev
                  </a>
                )}
                {page < totalPages && (
                  <a href={buildUrl({ page: String(page + 1) })}
                    className="px-3 py-1.5 text-[12px] text-slate-300 border border-white/7 rounded-[6px] hover:text-white">
                    Next →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Card to Inventory" width="max-w-lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Card Name *</label>
              <input
                type="text"
                required
                autoFocus
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Charizard ex"
                className="w-full bg-navy-900 border border-white/12 rounded-[6px] text-white text-[14px] px-3.5 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Set Name *</label>
              <input
                type="text"
                required
                value={addForm.set}
                onChange={(e) => setAddForm({ ...addForm, set: e.target.value })}
                placeholder="e.g. Obsidian Flames"
                className="w-full bg-navy-900 border border-white/12 rounded-[6px] text-white text-[14px] px-3.5 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Set Number</label>
              <input
                type="text"
                value={addForm.setNumber}
                onChange={(e) => setAddForm({ ...addForm, setNumber: e.target.value })}
                placeholder="e.g. 215/197"
                className="w-full bg-navy-900 border border-white/12 rounded-[6px] text-white text-[14px] px-3.5 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Rarity</label>
              <input
                type="text"
                value={addForm.rarity}
                onChange={(e) => setAddForm({ ...addForm, rarity: e.target.value })}
                placeholder="e.g. Special Illustration Rare"
                className="w-full bg-navy-900 border border-white/12 rounded-[6px] text-white text-[14px] px-3.5 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Condition</label>
              <select
                value={addForm.condition}
                onChange={(e) => setAddForm({ ...addForm, condition: e.target.value as Condition })}
                className="w-full bg-navy-900 border border-white/12 rounded-[6px] text-white text-[14px] px-3.5 py-2.5 outline-none focus:border-accent cursor-pointer"
              >
                <option value="NM">Near Mint (NM)</option>
                <option value="LP">Lightly Played (LP)</option>
                <option value="MP">Moderately Played (MP)</option>
                <option value="HP">Heavily Played (HP)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Purchase Price (£) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={addForm.purchasePrice}
                onChange={(e) => setAddForm({ ...addForm, purchasePrice: e.target.value })}
                placeholder="0.00"
                className="w-full bg-navy-900 border border-white/12 rounded-[6px] text-white text-[14px] font-mono px-3.5 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Market Value (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addForm.marketValue}
                onChange={(e) => setAddForm({ ...addForm, marketValue: e.target.value })}
                placeholder="0.00"
                className="w-full bg-navy-900 border border-white/12 rounded-[6px] text-white text-[14px] font-mono px-3.5 py-2.5 outline-none focus:border-accent placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-accent text-white font-bold text-[14px] py-3 rounded-[10px] hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {isPending ? "Adding…" : "Add to Inventory"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-3 text-slate-300 border border-white/12 rounded-[10px] text-[14px] hover:text-white hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
