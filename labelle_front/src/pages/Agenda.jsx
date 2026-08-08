import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentsApi, ServicesApi, ProfessionalsApi, ClientsApi } from "@/server/api";
import { Plus, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import AppointmentForm from "@/components/agenda/AppointmentForm";
import FinalizeSheet from "@/components/agenda/FinalizeSheet";
import { toast } from "@/components/ui/use-toast";
import { statusColors, statusLabels } from "@/lib/appointmentStatus";
import { formatBRL } from "@/lib/format";


export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [finalizingApt, setFinalizingApt] = useState(null);
  const queryClient = useQueryClient();
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const weekRowRef = useRef(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
  });

  // Mantém o dia selecionado visível na fileira scrollável (centraliza).
  useEffect(() => {
    const row = weekRowRef.current;
    if (!row) return;
    const chip = row.querySelector(`[data-date="${dateStr}"]`);
    if (!chip) return;
    const target = chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [dateStr, isLoading]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowForm(false);
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

  // Confirmar e lembrete são enviados pelo backend a partir do WhatsApp da
  // empresa (WAHA) — não abrem mais o WhatsApp pessoal de quem está logado.
  const confirmMutation = useMutation({
    mutationFn: ({ id }) => AppointmentsApi.confirm({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Não foi possível confirmar o agendamento",
        description: "Tente novamente em instantes.",
      });
    },
  });

  // Iniciar e cancelar também são transições do state machine no backend.
  const startMutation = useMutation({
    mutationFn: ({ id }) => AppointmentsApi.start({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Não foi possível iniciar o atendimento",
        description: "Tente novamente em instantes.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id }) => AppointmentsApi.cancel({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Não foi possível cancelar o agendamento",
        description: "Tente novamente em instantes.",
      });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: ({ id }) => AppointmentsApi.sendReminder({ id }),
    onSuccess: () => {
      toast({ title: "Lembrete enviado" });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Não foi possível enviar o lembrete",
        description: "Tente novamente em instantes.",
      });
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

  // O status anda só pelas transições do state machine no backend —
  // nunca por um update com status solto.
  const handleStatusChange = (apt, newStatus) => {
    if (newStatus === "confirmado") {
      confirmMutation.mutate({ id: apt.id });
    } else if (newStatus === "em_atendimento") {
      startMutation.mutate({ id: apt.id });
    } else if (newStatus === "cancelado") {
      cancelMutation.mutate({ id: apt.id });
    }
  };

  const handleSendReminder = (e, apt) => {
    e.stopPropagation();
    reminderMutation.mutate({ id: apt.id });
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
        <div ref={weekRowRef} className="flex gap-1 overflow-x-auto -mx-5 px-5 pb-1">
          {isLoading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-14 flex-1 rounded-xl" />
            ))
          ) : (
          weekDays.map((d) => {
            const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const isSelected = format(d, "yyyy-MM-dd") === dateStr;
            const dayAppts = appointments.filter(a => a.date === format(d, "yyyy-MM-dd"));
            const hasAppts = dayAppts.some(a => a.status !== "cancelado");
            // Dia só com cancelados ganha um pontinho cinza, para não parecer vazio.
            const hasOnlyCancelled = !hasAppts && dayAppts.length > 0;
            return (
              <button
                key={d.toISOString()}
                data-date={format(d, "yyyy-MM-dd")}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-150 shrink-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
                  isToday && !isSelected && "ring-1 ring-primary/30"
                )}
              >
                <span className="text-xs font-medium uppercase">
                  {format(d, "EEE", { locale: ptBR })}
                </span>
                <span className="text-lg font-bold">{format(d, "d")}</span>
                {hasAppts && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                {hasOnlyCancelled && !isSelected && <div className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-0.5" />}
              </button>
            );
          })
          )}
        </div>
      </div>

      {/* Appointments list */}
      <div className="px-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : dayAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p>Nenhum agendamento</p>
            <p className="text-xs mt-1">Toque em + para adicionar</p>
          </div>
        ) : (
          dayAppointments.map((apt) => (
            <div
              key={apt.id}
              role="button"
              tabIndex={0}
              className="bg-card rounded-2xl border border-border/50 overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    <Badge className={cn("text-xs border-0", statusColors[apt.status])}>
                      {statusLabels[apt.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{apt.time} • {apt.duration_minutes}min</span>
                    <span>{apt.professional_name}</span>
                    {apt.price > 0 && <span className="font-medium text-foreground tabular-nums">{formatBRL(apt.price)}</span>}
                  </div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {apt.status === "agendado" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, "confirmado"); }}>Confirmar</Button>
                    )}
                    {apt.status === "confirmado" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, "em_atendimento"); }}>Iniciar</Button>
                    )}
                    {apt.status === "em_atendimento" && (
                      <Button size="sm" className="h-7 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); setFinalizingApt(apt); }}>Serviços / Finalizar</Button>
                    )}
                    {apt.status !== "cancelado" && apt.status !== "concluido" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-destructive" onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, "cancelado"); }}>Cancelar</Button>
                    )}
                    {apt.client_phone && apt.status !== "cancelado" && apt.status !== "concluido" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs rounded-lg text-emerald-600 gap-1"
                        disabled={reminderMutation.isPending}
                        onClick={(e) => handleSendReminder(e, apt)}
                      >
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

      <FinalizeSheet
        open={!!finalizingApt}
        onClose={() => setFinalizingApt(null)}
        appointment={finalizingApt}
        services={services}
        onFinalized={() => queryClient.invalidateQueries({ queryKey: ["appointments"] })}
      />
    </div>
  );
}
