import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { AppointmentsApi, ProfessionalsApi, TransactionsApi } from "@/server/api";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import { sendWhatsApp, buildConfirmationMessage, buildReminderMessage } from "@/lib/whatsapp";

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
  em_atendimento: "Atendendo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default function MinhaAgenda() {
  const { user } = useRouteContext({ from: "__root__" });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: myProfessionals = [] } = useQuery({
    queryKey: ["my-professional", user?.id],
    queryFn: () => ProfessionalsApi.list({ filter: { user_id: user.id } }),
    enabled: !!user,
  });
  const myProfessional = myProfessionals[0] || null;

  // The Appointment read policy already restricts a "profissional" actor to
  // their own appointments (professional.user_id == actor.id), so this list
  // is already scoped correctly by the backend.
  const { data: appointments = [] } = useQuery({
    queryKey: ["professional-appointments", user?.id],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
    enabled: !!myProfessional,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => AppointmentsApi.update({ id, attributes: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-appointments"] });
    },
  });

  const myAppointments = appointments;

  const dayAppointments = myAppointments
    .filter(a => a.date === dateStr)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - selectedDate.getDay()), i);
    return d;
  });

  const handleStatusChange = async (apt, newStatus) => {
    updateMutation.mutate({ id: apt.id, data: { status: newStatus } });
    if (newStatus === "confirmado" && apt.client_phone) {
      sendWhatsApp(apt.client_phone, buildConfirmationMessage({
        clientName: apt.client_name,
        serviceName: apt.service_name,
        professionalName: apt.professional_name,
        date: apt.date,
        time: apt.time,
      }));
    }
    if (newStatus === "concluido") {
      const existing = await TransactionsApi.list({ filter: { appointment_id: apt.id } });
      if (!existing || existing.length === 0) {
        await TransactionsApi.create({
          data: {
            type: "entrada",
            category: "servico",
            description: `${apt.service_name} – ${apt.client_name}`,
            amount: apt.price || 0,
            date: apt.date,
            payment_method: "a_definir",
            appointment_id: apt.id,
            professional_id: apt.professional_id,
            client_id: apt.client_id || "",
            status: "pendente_confirmacao",
          },
        });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
      }
    }
  };

  if (!myProfessional) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-3">
        <p className="text-muted-foreground text-sm">
          Seu usuário ainda não está vinculado a um profissional.
        </p>
        <p className="text-xs text-muted-foreground">Solicite ao administrador que vincule seu perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Minha Agenda"
        subtitle={myProfessional.name}
      />

      {/* Date navigation */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 7))} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())} className="text-xs text-primary">
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 7))} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-1 justify-between">
          {weekDays.map((d) => {
            const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const isSelected = format(d, "yyyy-MM-dd") === dateStr;
            const hasAppts = myAppointments.some(a => a.date === format(d, "yyyy-MM-dd") && a.status !== "cancelado");
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-xl transition-all flex-1",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
                  isToday && !isSelected && "ring-1 ring-primary/30"
                )}
              >
                <span className="text-[10px] font-medium uppercase">{format(d, "EEE", { locale: ptBR })}</span>
                <span className="text-lg font-bold">{format(d, "d")}</span>
                {hasAppts && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments */}
      <div className="px-5 space-y-3">
        {dayAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p>Nenhum agendamento para este dia</p>
          </div>
        ) : (
          dayAppointments.map((apt) => (
            <div key={apt.id} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="flex">
                <div className="w-1.5 bg-primary/70 flex-shrink-0" />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{apt.client_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{apt.service_name}</p>
                    </div>
                    <Badge className={cn("text-[10px] border-0", statusColors[apt.status])}>
                      {statusLabels[apt.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{apt.time} • {apt.duration_minutes}min</span>
                    {apt.price > 0 && <span className="font-medium text-foreground">R$ {apt.price}</span>}
                  </div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {apt.status === "agendado" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => handleStatusChange(apt, "confirmado")}>Confirmar</Button>
                    )}
                    {apt.status === "confirmado" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => handleStatusChange(apt, "em_atendimento")}>Iniciar</Button>
                    )}
                    {apt.status === "em_atendimento" && (
                      <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => handleStatusChange(apt, "concluido")}>Concluir</Button>
                    )}
                    {apt.client_phone && apt.status !== "cancelado" && apt.status !== "concluido" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-emerald-600 gap-1"
                        onClick={() => sendWhatsApp(apt.client_phone, buildReminderMessage({
                          clientName: apt.client_name, serviceName: apt.service_name,
                          professionalName: apt.professional_name, date: apt.date, time: apt.time,
                        }))}>
                        <MessageCircle className="w-3 h-3" /> Lembrete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
