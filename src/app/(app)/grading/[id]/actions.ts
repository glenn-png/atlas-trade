"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function returnCard(data: {
  cardId: string;
  submissionId: string;
  grade: string;
  gradingCost: number;
  marketValue: number;
}) {
  await prisma.card.update({
    where: { id: data.cardId },
    data: {
      grade: data.grade,
      gradingCost: data.gradingCost,
      marketValue: data.marketValue,
      itemType: "GRADED",
      status: "IN_STOCK",
      gradedAt: new Date(),
    },
  });

  // Check if all cards in submission are returned
  const submission = await prisma.gradingSubmission.findUnique({
    where: { id: data.submissionId },
    include: { cards: { select: { status: true } } },
  });

  const allReturned = submission?.cards.every((c) => c.status === "IN_STOCK");
  if (allReturned) {
    await prisma.gradingSubmission.update({
      where: { id: data.submissionId },
      data: { status: "RETURNED", returnedAt: new Date() },
    });
  }

  revalidatePath(`/grading/${data.submissionId}`);
  revalidatePath("/grading");
}

export async function updateSubmissionNotes(submissionId: string, notes: string) {
  await prisma.gradingSubmission.update({
    where: { id: submissionId },
    data: { notes },
  });
  revalidatePath(`/grading/${submissionId}`);
}
