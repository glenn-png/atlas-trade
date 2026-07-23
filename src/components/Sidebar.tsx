"use client";

import { useState } from "react";
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
  Menu,
  X,
  Award,
} from "lucide-react";

import { Users } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/trade-in", label: "Trade-In", icon: ArrowLeftRight, adminOnly: false },
  { href: "/grading", label: "Grading", icon: Award, adminOnly: false },
  { href: "/inventory", label: "Inventory", icon: Package, adminOnly: false },
  { href: "/vat", label: "VAT Centre", icon: Receipt, adminOnly: true },
  { href: "/reports", label: "Reports", icon: FileText, adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
];

function NavContent({
  inventoryCount,
  role,
  onNavigate,
}: {
  inventoryCount?: number;
  role: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="px-2.5 pb-5 text-[15px] font-extrabold tracking-tight text-white hidden lg:block">
        Atlas <span className="text-accent">Trade</span>
      </div>

      {navItems.filter(item => !item.adminOnly || role === "ADMIN").map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2.5 rounded-[6px] text-[13px] font-medium transition-all border",
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

      {role === "ADMIN" && (
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2.5 rounded-[6px] text-[13px] font-medium transition-all border",
            usePathname().startsWith("/settings")
              ? "text-white bg-navy-700 border-white/12"
              : "text-slate-300 border-transparent hover:text-white hover:bg-navy-800"
          )}
        >
          <Settings size={16} />
          Settings
        </Link>
      )}

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
    </>
  );
}

export function Sidebar({ inventoryCount, role = "STAFF" }: { inventoryCount?: number; role?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] bg-navy-900 border-r border-white/7 flex-col py-5 px-3 gap-1 shrink-0">
        <NavContent inventoryCount={inventoryCount} role={role} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-navy-900 border-b border-white/7 flex items-center px-4 h-14">
        <button
          onClick={() => setOpen(true)}
          className="text-slate-300 hover:text-white transition-colors mr-3"
        >
          <Menu size={22} />
        </button>
        <div className="text-[15px] font-extrabold tracking-tight text-white">
          Atlas <span className="text-accent">Trade</span>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-navy-900 border-r border-white/7 flex flex-col py-5 px-3 gap-1 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-2.5 pb-5">
          <div className="text-[15px] font-extrabold tracking-tight text-white">
            Atlas <span className="text-accent">Trade</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <NavContent inventoryCount={inventoryCount} role={role} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
