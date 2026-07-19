"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function deleteTrade(tradeId: string) {
  await prisma.card.deleteMany({ where: { tradeId } });
  await prisma.trade.delete({ where: { id: tradeId } });
  redirect("/trades");
}
