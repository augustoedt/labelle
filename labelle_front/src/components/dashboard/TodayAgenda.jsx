import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const statusColors = {
  agendado: "bg-blue-100 text-blue-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  em_atendimento: "bg-amber-100 text-amber-700",
  concluido: "bg-muted text-muted-foreground",
  cancelado: "bg-red-100 text-red-700",
};

const statusLabels = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default function TodayAgenda({ appointments, isLoading }) {
  if (isLoading) {
    return (
      <div className="px-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-muted-foreground text-sm">
        Nenhum agendamento para hoje
      </div>
    );
  }

  return (
    <div className="px-5 space-y-3">
      {appointments.map((apt) => (
        <div
          key={apt.id}
          className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 shadow-sm"
        >
          <div className="text-center min-w-[50px]">
            <p className="text-sm font-bold text-foreground">{apt.time}</p>
            <p className="text-xs text-muted-foreground">{apt.duration_minutes}min</p>
          </div>
          <div className="w-px h-10 bg-primary/30 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{apt.client_name}</p>
            <p className="text-xs text-muted-foreground truncate">{apt.service_name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{apt.professional_name}</span>
            </div>
          </div>
          <Badge className={cn("text-xs border-0 font-medium", statusColors[apt.status])}>
            {statusLabels[apt.status]}
          </Badge>
        </div>
      ))}
    </div>
  );
}