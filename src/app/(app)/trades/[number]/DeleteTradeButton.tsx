"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTrade } from "./actions";

export function DeleteTradeButton({ tradeId, tradeNumber, cardCount }: {
  tradeId: string;
  tradeNumber: number;
  cardCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteTrade(tradeId);
    });
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-danger border border-danger/25 bg-danger/5 rounded-[8px] hover:bg-danger/15 transition-colors"
      >
        <Trash2 size={13} />
        Delete trade
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-navy-800 border border-white/10 rounded-[14px] w-full max-w-sm p-6 space-y-4">
            <div className="text-[16px] font-bold text-white">Delete Trade #{tradeNumber}?</div>
            <p className="text-[13px] text-slate-400">
              This will permanently remove the trade and all {cardCount} item{cardCount !== 1 ? "s" : ""} from inventory. This cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="flex-1 py-3 rounded-[10px] text-[14px] font-semibold text-slate-300 border border-white/12 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 py-3 rounded-[10px] text-[14px] font-bold text-white bg-danger hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
