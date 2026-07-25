"use client";

import { useState, useTransition } from "react";
import { formatGBP } from "@/lib/utils";
import { addManualSalesDay, addManualSalesMonth, deleteSalesDay } from "./actions";
import { Plus, Trash2 } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export function ManualSalesEntry() {
  const now = new Date();
  const [mode, setMode] = useState<"daily" | "monthly">("monthly");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  // Daily state
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [dailyAmount, setDailyAmount] = useState("");

  // Monthly state
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [monthlyAmount, setMonthlyAmount] = useState("");

  // Year options: current year and last 2
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "daily") {
      const num = parseFloat(dailyAmount);
      if (!num || !date) return;
      startTransition(async () => {
        await addManualSalesDay({ date, amount: num });
        setDailyAmount("");
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      });
    } else {
      const num = parseFloat(monthlyAmount);
      if (!num) return;
      startTransition(async () => {
        await addManualSalesMonth({ year: selectedYear, month: selectedMonth, amount: num });
        setMonthlyAmount("");
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex bg-navy-900 border border-white/7 rounded-[8px] p-0.5 gap-0.5 w-fit">
        {(["monthly", "daily"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setDone(false); }}
            className={`px-4 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all capitalize ${
              mode === m
                ? "bg-navy-600 text-white border border-white/12"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {m === "monthly" ? "Monthly total" : "Daily entry"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
        {mode === "monthly" ? (
          <>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-navy-800 border border-white/12 rounded-[6px] text-white text-[13px] px-3 py-2 outline-none focus:border-accent appearance-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-navy-800 border border-white/12 rounded-[6px] text-white text-[13px] px-3 py-2 outline-none focus:border-accent appearance-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">MS Singles total for month (£)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  autoFocus
                  className="bg-navy-800 border border-white/12 rounded-[6px] text-white text-[13px] font-mono pl-7 pr-3 py-2 outline-none focus:border-accent placeholder:text-slate-500 w-[180px]"
                />
              </div>
            </div>
          </>
        ) : (
          <>
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
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">MS Singles total (£)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dailyAmount}
                  onChange={(e) => setDailyAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-navy-800 border border-white/12 rounded-[6px] text-white text-[13px] font-mono pl-7 pr-3 py-2 outline-none focus:border-accent placeholder:text-slate-500 w-[160px]"
                />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white text-[13px] font-semibold rounded-[6px] hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          <Plus size={14} /> Save
        </button>
        {done && <span className="text-success text-[13px] font-semibold">✓ Saved</span>}
      </form>
    </div>
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
