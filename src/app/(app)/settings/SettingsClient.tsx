"use client";

import { useState, useTransition } from "react";
import { saveTradeRules } from "./actions";

interface Store {
  id: string;
  cashOfferPct: number;
  creditOfferPct: number;
  allowOverride: boolean;
}

export function SettingsClient({ store }: { store: Store }) {
  const [cashPct, setCashPct] = useState(store.cashOfferPct);
  const [creditPct, setCreditPct] = useState(store.creditOfferPct);
  const [allowOverride, setAllowOverride] = useState(store.allowOverride);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveTradeRules({ id: store.id, cashOfferPct: cashPct, creditOfferPct: creditPct, allowOverride });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <div className="text-[17px] font-bold text-white border-b border-white/7 pb-4">Trade Rules</div>

      <div className="bg-navy-800 border border-white/7 rounded-[10px] p-5 space-y-5">
        <div>
          <div className="text-[14px] font-semibold text-white mb-1">Default Cash Offer</div>
          <div className="text-[12px] text-slate-400 mb-3">
            Percentage of market value offered as cash. Editable per-trade at the counter.
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={cashPct}
              onChange={(e) => setCashPct(parseFloat(e.target.value) || 0)}
              className="w-[90px] bg-navy-800 border border-white/12 rounded-[6px] text-white text-[18px] font-bold text-center px-3 py-2 outline-none focus:border-accent font-mono"
            />
            <span className="text-[20px] font-bold text-slate-400">%</span>
            <span className="text-[13px] text-slate-400">of market value</span>
          </div>
        </div>

        <div className="border-t border-white/7" />

        <div>
          <div className="text-[14px] font-semibold text-white mb-1">Default Store Credit Offer</div>
          <div className="text-[12px] text-slate-400 mb-3">
            Higher percentage offered as store credit to incentivise credit over cash.
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={creditPct}
              onChange={(e) => setCreditPct(parseFloat(e.target.value) || 0)}
              className="w-[90px] bg-navy-800 border border-white/12 rounded-[6px] text-white text-[18px] font-bold text-center px-3 py-2 outline-none focus:border-accent font-mono"
            />
            <span className="text-[20px] font-bold text-slate-400">%</span>
            <span className="text-[13px] text-slate-400">of market value</span>
          </div>
        </div>

        <div className="border-t border-white/7" />

        <div>
          <div className="text-[14px] font-semibold text-white mb-1">Allow staff to override percentages</div>
          <div className="text-[12px] text-slate-400 mb-3">
            If disabled, staff see the offer but cannot change the percentage.
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setAllowOverride(!allowOverride)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: allowOverride ? "var(--color-accent)" : "var(--color-navy-700)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{ left: allowOverride ? "calc(100% - 22px)" : "2px" }}
              />
            </button>
            <span className="text-[13px] text-white">{allowOverride ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2.5 bg-accent text-white text-[14px] font-semibold rounded-[6px] hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {saved ? "✓ Saved" : "Save changes"}
        </button>
        <button className="px-4 py-2.5 text-slate-300 text-[14px] border border-white/7 rounded-[6px] hover:text-white hover:border-white/20 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
