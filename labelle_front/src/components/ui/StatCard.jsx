import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, trend, className }) {
  return (
    <div className={cn("bg-card rounded-2xl p-4 border border-border/50", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-xl font-heading font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        {Icon && (
          <div className="p-2 rounded-xl bg-primary/10">
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