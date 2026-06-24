import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, inventoryCount] = await Promise.all([
    getServerSession(authOptions),
    prisma.card.count({ where: { status: "IN_STOCK" } }),
  ]);

  const role = (session?.user as { role?: string })?.role ?? "STAFF";

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <Sidebar inventoryCount={inventoryCount} role={role} />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
