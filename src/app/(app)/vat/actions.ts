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

export async function addManualSalesMonth(input: {
  year: number;
  month: number; // 0-indexed
  amount: number;
}) {
  // Store as the 1st of the month at midnight UTC
  const date = new Date(Date.UTC(input.year, input.month, 1));

  await prisma.salesDay.upsert({
    where: { date },
    update: { msSinglesTotal: input.amount, source: "MANUAL_MONTHLY", syncedAt: new Date() },
    create: {
      id: crypto.randomUUID(),
      date,
      msSinglesTotal: input.amount,
      transactionCount: 0,
      source: "MANUAL_MONTHLY",
    },
  });

  revalidatePath("/vat");
}

export async function deleteSalesDay(id: string) {
  await prisma.salesDay.delete({ where: { id } });
  revalidatePath("/vat");
}

export async function markQuarterFiled(quarter: string) {
  await prisma.vatFiling.upsert({
    where: { quarter },
    update: { filedAt: new Date() },
    create: { quarter, filedAt: new Date() },
  });
  revalidatePath("/vat");
}

export async function unmarkQuarterFiled(quarter: string) {
  await prisma.vatFiling.deleteMany({ where: { quarter } });
  revalidatePath("/vat");
}
