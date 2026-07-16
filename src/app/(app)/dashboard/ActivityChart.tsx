"use client";

export type Bar = { label: string; trades: number };

export function ActivityChart({ bars }: { bars: Bar[] }) {
  const maxTrades = Math.max(...bars.map((b) => b.trades), 1);
  const hasData = bars.some((b) => b.trades > 0);

  if (!hasData) {
    return (
      <div className="h-28 flex items-center justify-center text-slate-500 text-[13px]">
        No activity this period
      </div>
    );
  }

  return (
    <div className="flex items-end gap-[3px] h-28">
      {bars.map((bar, i) => {
        const heightPct = bar.trades > 0 ? Math.max((bar.trades / maxTrades) * 100, 8) : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
            {bar.trades > 0 && (
              <div className="absolute bottom-[26px] left-1/2 -translate-x-1/2 bg-navy-700 border border-white/10 rounded-[4px] px-2 py-0.5 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {bar.trades}
              </div>
            )}
            <div className="w-full flex items-end" style={{ height: "96px" }}>
              {bar.trades > 0 ? (
                <div
                  className="w-full rounded-t-[3px] bg-accent/60 group-hover:bg-accent transition-colors"
                  style={{ height: `${heightPct}%` }}
                />
              ) : (
                <div className="w-full h-[2px] bg-white/5 rounded self-end" />
              )}
            </div>
            {bar.label && (
              <div className="text-[9px] text-slate-500 font-medium leading-none whitespace-nowrap">
                {bar.label}
              </div>
            )}
            {!bar.label && <div className="h-[10px]" />}
          </div>
        );
      })}
    </div>
  );
}
