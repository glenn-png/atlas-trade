import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export function calcVAT(purchasePrice: number, salePrice: number): number {
  const margin = salePrice - purchasePrice;
  return margin > 0 ? margin / 6 : 0;
}

export function calcMargin(
  purchasePrice: number,
  salePrice: number
): { amount: number; pct: number } {
  const amount = salePrice - purchasePrice;
  const pct = purchasePrice > 0 ? (amount / salePrice) * 100 : 0;
  return { amount, pct };
}
