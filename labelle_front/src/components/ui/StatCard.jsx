import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, trend, className }) {
  return (
    <div className={cn("bg-card/90 rounded-2xl p-4 border border-border/60 shadow-[0_8px_24px_-18px_hsl(var(--foreground)/0.45)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide">{title}</p>
          <p className="text-[1.45rem] leading-none font-heading font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        {Icon && (
          <div className="shrink-0 rounded-xl bg-primary/10 p-2 ring-1 ring-inset ring-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      {trend && (
        <p className="text-xs text-muted-foreground mt-2">{trend}</p>
      )}
    </div>
  );
}