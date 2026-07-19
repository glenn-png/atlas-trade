"use client";

import { useTransition } from "react";
import { toggleGradeWorthy } from "@/app/(app)/inventory/actions";

export function GradeWorthyButton({ cardId, gradeWorthy }: { cardId: string; gradeWorthy: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => toggleGradeWorthy({ cardId, gradeWorthy: !gradeWorthy }))}
      disabled={isPending}
      title={gradeWorthy ? "Remove grade worthy flag" : "Flag as grade worthy"}
      className={`px-2.5 py-1 text-[11px] font-semibold rounded-[6px] border transition-colors disabled:opacity-40 ${
        gradeWorthy
          ? "text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
          : "text-slate-400 border-white/7 hover:text-amber-400 hover:border-amber-500/30"
      }`}
    >
      🏆
    </button>
  );
}
