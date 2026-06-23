"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function saveTradeRules({
  id,
  cashOfferPct,
  creditOfferPct,
  allowOverride,
}: {
  id: string;
  cashOfferPct: number;
  creditOfferPct: number;
  allowOverride: boolean;
}) {
  await prisma.store.update({
    where: { id },
    data: { cashOfferPct, creditOfferPct, allowOverride },
  });
  revalidatePath("/settings");
  revalidatePath("/trade-in");
}
