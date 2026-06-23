export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; condition?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const statusFilter = params.status ?? "IN_STOCK";
  const conditionFilter = params.condition ?? "";
  const page = parseInt(params.page ?? "1");
  const perPage = 20;

  const where = {
    ...(q ? { OR: [{ name: { contains: q } }, { set: { contains: q } }] } : {}),
    ...(statusFilter && statusFilter !== "ALL" ? { status: statusFilter as "IN_STOCK" | "SOLD" | "RESERVED" } : {}),
    ...(conditionFilter ? { condition: conditionFilter as "NM" | "LP" | "MP" | "HP" } : {}),
  };

  const [cards, total, inStockCount, stockValue] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { acquiredAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { trade: { select: { number: true } } },
    }),
    prisma.card.count({ where }),
    prisma.card.count({ where: { status: "IN_STOCK" } }),
    prisma.card.aggregate({ where: { status: "IN_STOCK" }, _sum: { purchasePrice: true } }),
  ]);

  return (
    <InventoryClient
      cards={cards}
      total={total}
      inStockCount={inStockCount}
      stockValue={stockValue._sum.purchasePrice ?? 0}
      page={page}
      perPage={perPage}
      q={q}
      statusFilter={statusFilter}
      conditionFilter={conditionFilter}
    />
  );
}
