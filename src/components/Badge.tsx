import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "amber" | "red" | "blue" | "purple" | "slate";

const variants: Record<BadgeVariant, string> = {
  green: "bg-success/12 text-success",
  amber: "bg-warning/12 text-warning",
  red: "bg-danger/12 text-danger",
  blue: "bg-accent/15 text-accent",
  purple: "bg-purple/12 text-purple",
  slate: "bg-slate-400/20 text-slate-300",
};

const dots: Record<BadgeVariant, string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
  blue: "bg-accent",
  purple: "bg-purple",
  slate: "bg-slate-300",
};

export function Badge({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-[0.3px]",
        variants[variant],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dots[variant])} />
      {children}
    </span>
  );
}
