import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClientAppointments } from "@/server/api";
import { Clock, Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

const statusConfig = {
  agendado: { label: "Agendado", color: "bg-secondary text-foreground" },
  confirmado: { label: "Confirmado", color: "bg-secondary text-foreground" },
  em_atendimento: { label: "Em atendimento", color: "bg-foreground text-background" },
  concluido: { label: "Concluído", color: "bg-foreground/10 text-foreground" },
  cancelado: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
};

export default function ClientHistory({ clientPhone, onSetPhone }) {
  const [phoneInput, setPhoneInput] = useState(clientPhone || "");
  const [searched, setSearched] = useState(!!clientPhone);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["client-appointments", clientPhone],
    queryFn: () => getClientAppointments({ data: { phone: clientPhone } }).then(r => r.appointments || []),
    enabled: !!clientPhone && searched,
  });

  const handleSearch = () => {
    if (phoneInput.length >= 8) {
      onSetPhone("", phoneInput);
      setSearched(true);
    }
  };

  if (!clientPhone || !searched) {
    return (
      <div className="px-5 py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
          <Phone className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-heading font-semibold text-lg">Seus agendamentos</h2>
          <p className="text-sm text-muted-foreground mt-1">Informe seu WhatsApp para ver seu histórico</p>
        </div>
        <div className="text-left space-y-2">
          <Label className="text-xs">WhatsApp</Label>
          <Input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="(00) 00000-0000" className="rounded-xl" />
        </div>
        <Button className="w-full rounded-xl h-11 font-semibold" onClick={handleSearch} disabled={phoneInput.length < 8}>
          Buscar histórico
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const upcoming = appointments.filter(a => a.status !== "cancelado" && a.status !== "concluido");
  const past = appointments.filter(a => a.status === "concluido" || a.status === "cancelado");

  return (
    <div className="px-5 py-5 space-y-6">
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Próximos</h2>
          <div className="space-y-3">
            {upcoming.map(a => (
              <AppointmentCard key={a.id} appt={a} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Histórico</h2>
          <div className="space-y-3">
            {past.map(a => (
              <AppointmentCard key={a.id} appt={a} />
            ))}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm">Nenhum agendamento encontrado.</p>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appt }) {
  const cfg = statusConfig[appt.status] || statusConfig.agendado;
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-sm">{appt.service_name}</p>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
      </div>
      <p className="text-xs text-muted-foreground">com {appt.professional_name}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(parseISO(appt.date), "dd/MM/yyyy")}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {appt.time}</span>
      </div>
      {appt.price && <p className="mt-2 text-sm font-heading font-bold tabular-nums">{formatBRL(appt.price)}</p>}
    </div>
  );
}
