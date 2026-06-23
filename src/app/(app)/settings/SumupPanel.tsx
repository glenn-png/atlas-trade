"use client";

import { useState, useTransition } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface SumupPanelProps {
  connected: boolean;
  merchantCode?: string;
  connectedAt?: Date;
  hasCredentials: boolean;
}

export function SumupPanel({ connected, merchantCode, connectedAt, hasCredentials }: SumupPanelProps) {
  const [syncing, startSync] = useTransition();
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function handleSync() {
    startSync(async () => {
      const res = await fetch("/api/sumup/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`✓ Synced ${data.synced} day${data.synced !== 1 ? "s" : ""}`);
      } else {
        setSyncResult(`Error: ${data.error}`);
      }
      setTimeout(() => setSyncResult(null), 5000);
    });
  }

  return (
    <div className="space-y-5">
      <div className="text-[17px] font-bold text-white border-b border-white/7 pb-4">SumUp Integration</div>

      {!hasCredentials && (
        <div className="bg-warning/10 border border-warning/30 rounded-[10px] px-4 py-3 text-[13px] text-warning">
          Add your <code className="font-mono">SUMUP_CLIENT_ID</code> and <code className="font-mono">SUMUP_CLIENT_SECRET</code> to <code className="font-mono">.env</code> before connecting.
          Register your app at <strong>developer.sumup.com</strong>.
        </div>
      )}

      <div className="bg-navy-800 border border-white/7 rounded-[10px] p-5 space-y-4">
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle size={20} className="text-success shrink-0" />
          ) : (
            <XCircle size={20} className="text-slate-500 shrink-0" />
          )}
          <div>
            <div className="text-[14px] font-semibold text-white">
              {connected ? "Connected" : "Not connected"}
            </div>
            {connected && merchantCode && (
              <div className="text-[12px] text-slate-400">
                Merchant: <span className="font-mono text-slate-300">{merchantCode}</span>
                {connectedAt && (
                  <> · Connected {new Date(connectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
                )}
              </div>
            )}
          </div>
        </div>

        {connected ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-[13px] font-semibold rounded-[6px] hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <a
              href="/api/sumup/auth"
              className="px-4 py-2 text-slate-300 text-[13px] border border-white/7 rounded-[6px] hover:text-white hover:border-white/20 transition-colors"
            >
              Reconnect
            </a>
            {syncResult && (
              <span className={`text-[13px] font-semibold ${syncResult.startsWith("✓") ? "text-success" : "text-danger"}`}>
                {syncResult}
              </span>
            )}
          </div>
        ) : (
          <a
            href="/api/sumup/auth"
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-white text-[13px] font-semibold rounded-[6px] transition-colors ${
              hasCredentials
                ? "bg-accent hover:bg-accent-hover"
                : "bg-navy-700 border border-white/12 cursor-not-allowed opacity-50 pointer-events-none"
            }`}
          >
            Connect SumUp account
          </a>
        )}
      </div>

      <div className="text-[12px] text-slate-400 leading-relaxed">
        Once connected, click <strong>Sync now</strong> to pull "MS - Single Cards" daily totals from SumUp into the VAT Centre.
        Only new days are fetched — past synced data is never re-downloaded.
      </div>
    </div>
  );
}
