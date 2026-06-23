"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Receipt,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trade-in", label: "Trade-In", icon: ArrowLeftRight },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/vat", label: "VAT Centre", icon: Receipt },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Sidebar({ inventoryCount }: { inventoryCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] bg-navy-900 border-r border-white/7 flex flex-col py-5 px-3 gap-1 shrink-0">
      <div className="px-2.5 pb-5 text-[15px] font-extrabold tracking-tight text-white">
        Atlas <span className="text-accent">Trade</span>
      </div>

      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-[13px] font-medium transition-all border",
              active
                ? "text-white bg-navy-700 border-white/12"
                : "text-slate-300 border-transparent hover:text-white hover:bg-navy-800"
            )}
          >
            <Icon size={16} className="shrink-0" />
            {label}
            {label === "Inventory" && inventoryCount !== undefined && (
              <span className="ml-auto bg-accent/15 text-accent text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {inventoryCount}
              </span>
            )}
          </Link>
        );
      })}

      <div className="flex-1" />

      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-[13px] font-medium transition-all border",
          pathname.startsWith("/settings")
            ? "text-white bg-navy-700 border-white/12"
            : "text-slate-300 border-transparent hover:text-white hover:bg-navy-800"
        )}
      >
        <Settings size={16} />
        Settings
      </Link>

      <div className="mt-4 pt-4 border-t border-white/7">
        <div className="flex items-center gap-2.5 p-2.5 bg-navy-800 border border-white/7 rounded-[10px]">
          <div className="w-8 h-8 rounded-[6px] bg-gradient-to-br from-accent to-purple flex items-center justify-center text-[13px] font-extrabold text-white shrink-0">
            AT
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-white">Atlas Cards</div>
            <div className="text-[11px] text-slate-400">Manager</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="text-slate-500 hover:text-white transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
