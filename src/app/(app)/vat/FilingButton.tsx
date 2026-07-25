"use client";

import { useTransition } from "react";
import { markQuarterFiled, unmarkQuarterFiled } from "./actions";

export function FilingButton({ quarter, filed, filedAt }: { quarter: string; filed: boolean; filedAt?: string }) {
  const [isPending, startTransition] = useTransition();

  if (filed) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success/15 text-success border border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          Filed
        </span>
        <button
          onClick={() => startTransition(() => unmarkQuarterFiled(quarter))}
          disabled={isPending}
          title={`Filed ${filedAt ? new Date(filedAt).toLocaleDateString("en-GB") : ""}. Click to unmark.`}
          className="text-[11px] text-slate-500 hover:text-danger transition-colors disabled:opacity-40"
        >
          undo
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => startTransition(() => markQuarterFiled(quarter))}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-navy-700 text-slate-300 border border-white/10 hover:bg-navy-600 hover:text-white transition-all disabled:opacity-40"
    >
      {isPending ? "Saving…" : "Mark as filed"}
    </button>
  );
}
