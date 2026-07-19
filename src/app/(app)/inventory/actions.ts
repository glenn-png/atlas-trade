"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

interface AddCardInput {
  name: string;
  set: string;
  setNumber?: string;
  rarity?: string;
  condition: "NM" | "LP" | "MP" | "HP";
  purchasePrice: number;
  marketValue?: number;
  notes?: string;
}

export async function toggleGradeWorthy({ cardId, gradeWorthy }: { cardId: string; gradeWorthy: boolean }) {
  await prisma.card.update({
    where: { id: cardId },
    data: { gradeWorthy },
  });
  revalidatePath("/inventory");
  revalidatePath("/grading");
}

export async function markAsSold({ cardId }: { cardId: string }) {
  await prisma.card.update({
    where: { id: cardId },
    data: { status: "SOLD", soldAt: new Date() },
  });
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
}

export async function addCard(input: AddCardInput) {
  await prisma.card.create({
    data: {
      name: input.name,
      set: input.set,
      setNumber: input.setNumber || null,
      rarity: input.rarity || null,
      condition: input.condition,
      purchasePrice: input.purchasePrice,
      marketValue: input.marketValue ?? null,
      notes: input.notes || null,
      status: "IN_STOCK",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/inventory");
}
