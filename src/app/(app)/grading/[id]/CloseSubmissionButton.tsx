"use client";

import { useState, useTransition } from "react";
import { closeSubmission } from "./actions";
import { CheckCircle } from "lucide-react";

export function CloseSubmissionButton({
  submissionId,
  pendingCount,
}: {
  submissionId: string;
  pendingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await closeSubmission(submissionId);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-success/10 border border-success/25 text-success text-[13px] font-semibold rounded-[8px] hover:bg-success/20 transition-colors"
      >
        <CheckCircle size={14} /> Close submission
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-navy-800 border border-white/10 rounded-[14px] w-full max-w-sm p-6 space-y-4">
            <div>
              <div className="text-[16px] font-bold text-white">Close submission?</div>
              <div className="text-[13px] text-slate-400 mt-1">
                {pendingCount > 0
                  ? `${pendingCount} card${pendingCount !== 1 ? "s" : ""} still pending. Closing will mark this submission as complete.`
                  : "Mark this submission as complete."}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 py-3 rounded-[10px] text-[14px] font-semibold text-slate-300 border border-white/12 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 py-3 rounded-[10px] text-[14px] font-bold text-white bg-success hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Closing…" : "Close submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
