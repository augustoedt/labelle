import { AlertTriangle, CalendarCheck, Package, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function AlertsSection({ appointments, products, isLoading }) {
  if (isLoading) {
    return (
      <div className="px-5 space-y-2">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    );
  }
  const alerts = [];

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments?.filter(a => a.date === today && a.status !== "cancelado") || [];
  if (todayAppointments.length >= 8) {
    alerts.push({ icon: CalendarCheck, text: "Agenda cheia hoje!", color: "text-amber-600 bg-amber-50" });
  }

  const lowStock = products?.filter(p => p.quantity <= (p.min_quantity || 5)) || [];
  if (lowStock.length > 0) {
    alerts.push({ icon: Package, text: `${lowStock.length} produto(s) com estoque baixo`, color: "text-red-600 bg-red-50" });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="px-5 space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alertas</h3>
      {alerts.map((alert, i) => (
        <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl", alert.color)}>
          <alert.icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-medium">{alert.text}</span>
        </div>
      ))}
    </div>
  );
}