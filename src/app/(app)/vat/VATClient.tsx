"use client";

import { useState, useTransition } from "react";
import { formatGBP } from "@/lib/utils";
import { addManualSalesDay, deleteSalesDay } from "./actions";
import { Plus, Trash2 } from "lucide-react";

interface SalesDay {
  id: string;
  date: Date;
  msSinglesTotal: number;
  transactionCount: number;
  source: string;
}

export function ManualSalesDayEntry() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || !date) return;
    startTransition(async () => {
      await addManualSalesDay({ date, amount: num });
      setAmount("");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="bg-navy-800 border border-white/12 rounded-[6px] text-white text-[13px] px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">MS - Single Cards total (£)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">£</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="bg-navy-800 border border-white/12 rounded-[6px] text-white text-[13px] font-mono pl-7 pr-3 py-2 outline-none focus:border-accent placeholder:text-slate-500 w-[160px]"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white text-[13px] font-semibold rounded-[6px] hover:bg-accent-hover transition-colors disabled:opacity-40"
      >
        <Plus size={14} /> Add entry
      </button>
      {done && <span className="text-success text-[13px] font-semibold">✓ Saved</span>}
    </form>
  );
}

export function SalesDayDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => deleteSalesDay(id))}
      disabled={isPending}
      className="text-slate-500 hover:text-danger transition-colors disabled:opacity-40"
      title="Delete entry"
    >
      <Trash2 size={13} />
    </button>
  );
}
