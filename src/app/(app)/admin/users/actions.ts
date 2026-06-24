"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") throw new Error("Unauthorised");
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "STAFF";
}) {
  await requireAdmin();
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
  });
  revalidatePath("/admin/users");
}

export async function updateUser(input: {
  id: string;
  name: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
}) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: input.id },
    data: { name: input.name, role: input.role, active: input.active },
  });
  revalidatePath("/admin/users");
}

export async function resetPassword(input: { id: string; password: string }) {
  await requireAdmin();
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.user.update({
    where: { id: input.id },
    data: { passwordHash },
  });
}
