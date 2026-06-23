"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

interface CardInput {
  name: string;
  set: string;
  setNumber?: string;
  rarity?: string;
  condition: "NM" | "LP" | "MP" | "HP";
  purchasePrice: number;
  marketValue: number;
  notes?: string;
}

interface CompleteTradeInput {
  paymentType: "CASH" | "STORE_CREDIT";
  cards: CardInput[];
}

export async function completeTrade(input: CompleteTradeInput): Promise<{ tradeNumber: number }> {
  const lastTrade = await prisma.trade.findFirst({ orderBy: { number: "desc" } });
  const number = (lastTrade?.number ?? 0) + 1;

  await prisma.trade.create({
    data: {
      id: crypto.randomUUID(),
      number,
      paymentType: input.paymentType,
      cards: {
        create: input.cards.map((c) => ({
          id: crypto.randomUUID(),
          name: c.name,
          set: c.set,
          setNumber: c.setNumber || null,
          rarity: c.rarity || null,
          condition: c.condition,
          purchasePrice: c.purchasePrice,
          marketValue: c.marketValue || null,
          notes: c.notes || null,
          paymentType: input.paymentType,
          status: "IN_STOCK" as const,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/trade-in");

  return { tradeNumber: number };
}
