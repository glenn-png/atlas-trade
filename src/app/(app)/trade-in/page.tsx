import { TradeInClient } from "./TradeInClient";
import { prisma } from "@/lib/prisma";

export default async function TradeInPage() {
  const store = await prisma.store.findFirst();
  const cashPct = store?.cashOfferPct ?? 70;
  const creditPct = store?.creditOfferPct ?? 80;

  const recentTrades = await prisma.trade.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      cards: { select: { purchasePrice: true } },
    },
  });

  const recentTradesSummary = recentTrades.map((t) => ({
    id: t.id,
    number: t.number,
    cardCount: t.cards.length,
    total: t.cards.reduce((s, c) => s + c.purchasePrice, 0),
    paymentType: t.paymentType,
    createdAt: t.createdAt,
  }));

  return (
    <TradeInClient
      defaultCashPct={cashPct}
      defaultCreditPct={creditPct}
      recentTrades={recentTradesSummary}
    />
  );
}
