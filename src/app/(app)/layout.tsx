import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inventoryCount = await prisma.card.count({
    where: { status: "IN_STOCK" },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <Sidebar inventoryCount={inventoryCount} />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
