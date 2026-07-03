import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentsApi, ServicesApi, ProfessionalsApi, ClientsApi, TransactionsApi } from "@/server/api";
import { Plus, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import AppointmentForm from "@/components/agenda/AppointmentForm";
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

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const queryClient = useQueryClient();
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => ClientsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => AppointmentsApi.create({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowForm(false);
      // Send WhatsApp confirmation when manager creates an appointment
      if (variables.client_phone) {
        sendWhatsApp(variables.client_phone, buildConfirmationMessage({
          clientName: variables.client_name,
          serviceName: variables.service_name,
          professionalName: variables.professional_name,
          date: variables.date,
          time: variables.time,
        }));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => AppointmentsApi.update({ id, attributes: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowForm(false);
      setEditingApt(null);
    },
  });

  const dayAppointments = appointments
    .filter(a => a.date === dateStr)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const handleSubmit = (data) => {
    if (editingApt) {
      updateMutation.mutate({ id: editingApt.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleStatusChange = async (apt, newStatus) => {
    updateMutation.mutate({ id: apt.id, data: { status: newStatus } });

    // Send WhatsApp when confirming appointment
    if (newStatus === "confirmado" && apt.client_phone) {
      sendWhatsApp(apt.client_phone, buildConfirmationMessage({
        clientName: apt.client_name,
        serviceName: apt.service_name,
        professionalName: apt.professional_name,
        date: apt.date,
        time: apt.time,
      }));
    }

    // Criar pré-lançamento financeiro ao concluir
    if (newStatus === "concluido") {
      // Verificar duplicidade
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

  const handleSendReminder = (e, apt) => {
    e.stopPropagation();
    if (apt.client_phone) {
      sendWhatsApp(apt.client_phone, buildReminderMessage({
        clientName: apt.client_name,
        serviceName: apt.service_name,
        professionalName: apt.professional_name,
        date: apt.date,
        time: apt.time,
      }));
    }
  };

  // Week days for quick navigation
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - selectedDate.getDay()), i);
    return d;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        subtitle={format(selectedDate, "MMMM yyyy", { locale: ptBR })}
        action={
          <Button size="sm" className="rounded-xl gap-1.5" onClick={() => { setEditingApt(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Novo
          </Button>
        }
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
            const hasAppts = appointments.some(a => a.date === format(d, "yyyy-MM-dd") && a.status !== "cancelado");
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
                <span className="text-[10px] font-medium uppercase">
                  {format(d, "EEE", { locale: ptBR })}
                </span>
                <span className="text-lg font-bold">{format(d, "d")}</span>
                {hasAppts && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments list */}
      <div className="px-5 space-y-3">
        {dayAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p>Nenhum agendamento</p>
            <p className="text-xs mt-1">Toque em + para adicionar</p>
          </div>
        ) : (
          dayAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
              onClick={() => { setEditingApt(apt); setShowForm(true); }}
            >
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
                    <span>{apt.professional_name}</span>
                    {apt.price > 0 && <span className="font-medium text-foreground">R$ {apt.price}</span>}
                  </div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {apt.status === "agendado" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, "confirmado"); }}>Confirmar</Button>
                    )}
                    {apt.status === "confirmado" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, "em_atendimento"); }}>Iniciar</Button>
                    )}
                    {apt.status === "em_atendimento" && (
                      <Button size="sm" className="h-7 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, "concluido"); }}>Concluir</Button>
                    )}
                    {apt.status !== "cancelado" && apt.status !== "concluido" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-destructive" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, "cancelado"); }}>Cancelar</Button>
                    )}
                    {apt.client_phone && apt.status !== "cancelado" && apt.status !== "concluido" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-emerald-600 gap-1" onClick={(e) => handleSendReminder(e, apt)}>
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

      <AppointmentForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingApt(null); }}
        onSubmit={handleSubmit}
        services={services}
        professionals={professionals}
        clients={clients}
        appointment={editingApt}
      />
    </div>
  );
}
