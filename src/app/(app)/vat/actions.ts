"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addManualSalesDay(input: {
  date: string;
  amount: number;
}) {
  const date = new Date(input.date);
  date.setUTCHours(0, 0, 0, 0);

  await prisma.salesDay.upsert({
    where: { date },
    update: { msSinglesTotal: input.amount, source: "MANUAL", syncedAt: new Date() },
    create: {
      id: crypto.randomUUID(),
      date,
      msSinglesTotal: input.amount,
      transactionCount: 0,
      source: "MANUAL",
    },
  });

  revalidatePath("/vat");
}

export async function deleteSalesDay(id: string) {
  await prisma.salesDay.delete({ where: { id } });
  revalidatePath("/vat");
}
