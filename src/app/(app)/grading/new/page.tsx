export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NewGradingClient } from "./NewGradingClient";

export default async function NewGradingPage() {
  const cards = await prisma.card.findMany({
    where: { status: "IN_STOCK" },
    include: { trade: { select: { number: true } } },
    orderBy: { acquiredAt: "desc" },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-900 border-b border-white/7 px-4 sm:px-6 py-3 shrink-0">
        <div className="text-[15px] font-bold text-white">Send for Grading</div>
        <div className="text-[13px] text-slate-400">Select cards from inventory and choose your grading company</div>
      </div>
      <div className="flex-1 overflow-hidden flex">
        <NewGradingClient cards={cards} />
      </div>
    </div>
  );
}
