export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";
import { SumupPanel } from "./SumupPanel";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;

  let store = await prisma.store.findFirst();
  if (!store) {
    store = await prisma.store.create({ data: {} });
  }

  const sumupCred = await prisma.sumupCredential.findFirst();
  const hasCredentials = !!(process.env.SUMUP_CLIENT_ID && process.env.SUMUP_CLIENT_SECRET);

  return (
    <div>
      <div className="bg-navy-900 border-b border-white/7 px-6 py-3">
        <div className="text-[15px] font-bold text-white">Settings</div>
        <div className="text-[13px] text-slate-400">Store configuration</div>
      </div>

      {params.connected === "1" && (
        <div className="mx-6 mt-4 bg-success/12 border border-success/30 rounded-[6px] px-4 py-2.5 text-[13px] text-success font-semibold">
          ✓ SumUp connected successfully
        </div>
      )}
      {params.error && (
        <div className="mx-6 mt-4 bg-danger/12 border border-danger/30 rounded-[6px] px-4 py-2.5 text-[13px] text-danger font-semibold">
          SumUp connection failed: {params.error}
        </div>
      )}

      <div className="p-6 space-y-8">
        <SettingsClient store={store} />

        <div className="border-t border-white/7 pt-8">
          <SumupPanel
            connected={!!sumupCred}
            merchantCode={sumupCred?.merchantCode}
            connectedAt={sumupCred?.connectedAt}
            hasCredentials={hasCredentials}
          />
        </div>
      </div>
    </div>
  );
}
