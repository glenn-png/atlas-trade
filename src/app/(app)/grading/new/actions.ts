"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createGradingSubmission(data: {
  company: string;
  reference: string;
  notes: string;
  cardIds: string[];
}) {
  const id = crypto.randomUUID();
  await prisma.gradingSubmission.create({
    data: {
      id,
      company: data.company,
      reference: data.reference || null,
      notes: data.notes || null,
      status: "SUBMITTED",
      cards: {
        connect: data.cardIds.map((cardId) => ({ id: cardId })),
      },
    },
  });

  await prisma.card.updateMany({
    where: { id: { in: data.cardIds } },
    data: { status: "GRADING" },
  });

  redirect(`/grading/${id}`);
}
