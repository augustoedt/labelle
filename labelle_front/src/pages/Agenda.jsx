import PhonePendingBadge from "@/components/ui/PhonePendingBadge";
import { hasPhone } from "@/lib/phonePending";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentsApi, ServicesApi, ProfessionalsApi, ClientsApi } from "@/server/api";
import { Plus, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, subDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import DaySchedule from "@/components/agenda/DaySchedule";
import AppointmentForm from "@/components/agenda/AppointmentForm";
import FinalizeSheet from "@/components/agenda/FinalizeSheet";
import { toast } from "@/components/ui/use-toast";
import { statusColors, statusLabels } from "@/lib/appointmentStatus";
import { formatBRL } from "@/lib/format";


export default function Agenda() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = location.search;
  const route = "/admin/agenda";
  const dateParam = typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date) && !Number.isNaN(new Date(`${search.date}T12:00:00`).getTime()) && format(new Date(`${search.date}T12:00:00`), "yyyy-MM-dd") === search.date ? search.date : null;
  const selectedDate = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();
  const [view, setView] = useState("day");
  const [showForm, setShowForm] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [finalizingApt, setFinalizingApt] = useState(null);
  const queryClient = useQueryClient();
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const updateSearch = (patch, replace = true) => navigate({ to: route, search: (previous) => ({ ...previous, ...patch }), replace });
  const navigateDate = (date) => { if (date !== dateStr) updateSearch({ date }, false); };
  const weekRowRef = useRef(null);

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
  });

  useEffect(() => {
    if (!dateParam) updateSearch({ date: dateStr });
  }, []);
  useEffect(() => {
    if (search.view === "new") { setEditingApt(null); setShowForm(true); setFinalizingApt(null); return; }
    if ((search.view === "edit" || search.view === "finalize") && !isLoading) {
      const apt = appointments.find((item) => String(item.id) === String(search.appointment));
      if (!apt) { updateSearch({ appointment: undefined, view: undefined }); setShowForm(false); setFinalizingApt(null); return; }
      if (search.view === "edit") { setEditingApt(apt); setShowForm(true); setFinalizingApt(null); }
      else { setShowForm(false); setFinalizingApt(apt); }
    } else if (!search.view) { setShowForm(false); setEditingApt(null); setFinalizingApt(null); }
  }, [search.view, search.appointment, appointments, isLoading]);

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

  const { data: professionals = [], isLoading: loadingProfessionals } = useQuery({
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
      updateSearch({ appointment: undefined, view: undefined });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => AppointmentsApi.update({ id, attributes: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowForm(false);
      setEditingApt(null);
      updateSearch({ appointment: undefined, view: undefined });
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

  const calendarStart = startOfWeek(selectedDate, {weekStartsOn: 1});
  const calendarDays = Array.from({length:28}, (_,i)=>addDays(calendarStart,i));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        subtitle={format(selectedDate, "MMMM yyyy", { locale: ptBR })}
        action={
          <Button size="sm" className="rounded-xl gap-1.5" onClick={() => updateSearch({ view: "new", appointment: undefined, time:undefined, professional:undefined }, false)}>
            <Plus className="w-4 h-4" /> Novo
          </Button>
        }
      />

      <div className="agenda-view-toggle px-5" role="group" aria-label="Visualização da agenda">
        <Button variant={view === "day" ? "default" : "outline"} onClick={()=>setView("day")}>Dia</Button>
        <Button variant={view === "fourWeeks" ? "default" : "outline"} onClick={()=>setView("fourWeeks")}>4 semanas</Button>
        <label>Data <input type="date" aria-label="Selecionar data" value={dateStr} onChange={e=>{if(e.target.value) navigateDate(e.target.value);}} /></label>
      </div>
      {isError && <p role="alert" className="px-5 text-destructive">Não foi possível carregar os agendamentos. Atualize a página para tentar novamente.</p>}
      {/* Date navigation */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigateDate(format(subDays(selectedDate, view === "fourWeeks" ? 28 : 1), "yyyy-MM-dd"))} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" /><span className="sr-only">Período anterior</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateDate(format(new Date(), "yyyy-MM-dd"))} className="text-xs text-primary">
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigateDate(format(addDays(selectedDate, view === "fourWeeks" ? 28 : 1), "yyyy-MM-dd"))} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" /><span className="sr-only">Próximo período</span>
          </Button>
        </div>
        {view === "day" && <div ref={weekRowRef} className="flex gap-1 overflow-x-auto -mx-5 px-5 pb-1">
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
                onClick={() => navigateDate(format(d, "yyyy-MM-dd"))}
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
        </div>}
      </div>

      {view === "fourWeeks" ? <div className="px-5">
        <p className="mb-3 text-sm font-medium">{format(calendarStart,"dd/MM")} – {format(addDays(calendarStart,27),"dd/MM/yyyy")}</p>
        <div className="four-week-scroll"><div className="four-week-calendar">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day=><div className="four-week-heading" key={day}>{day}</div>)}
          {calendarDays.map(day=>{
            const key=format(day,"yyyy-MM-dd"), daily=appointments.filter(a=>a.date===key);
            return <button key={key} className={`four-week-day ${key === format(new Date(),"yyyy-MM-dd") ? "is-today" : ""}`} onClick={()=>{navigateDate(format(day,"yyyy-MM-dd"));setView("day");}} aria-label={`${format(day,"dd/MM/yyyy")}, ${daily.length} agendamentos`}>
              <strong>{format(day,"d MMM",{locale:ptBR})}</strong>
              <span className="four-week-count">{daily.length ? `${daily.length} agendamento${daily.length>1 ? "s" : ""}` : "Sem agendamentos"}</span>
              {daily.slice().sort((a,b)=>(a.time || "").localeCompare(b.time || "")).slice(0,3).map(a=><span className={`four-week-event ${!hasPhone(a.client_phone) ? "appointment-phone-missing" : ""} ${a.status === "cancelado" ? "is-cancelled" : ""}`} key={a.id}>{a.time?.slice(0,5)} {a.client_name}<PhonePendingBadge phone={a.client_phone}/><small>{a.professional_name}</small></span>)}
              {daily.length>3 && <small>+{daily.length-3} · ver dia</small>}
            </button>;
          })}
        </div></div>
      </div> : <div className="px-5"><DaySchedule date={selectedDate} professionals={professionals} appointments={appointments} isLoading={isLoading || loadingProfessionals} onAppointment={apt=>updateSearch({appointment:apt.id,view:"edit"},false)} onSlot={slot=>updateSearch({date:slot.date,time:slot.time,professional:slot.professional_id,view:"new",appointment:undefined},false)} /></div>}

      {/* Appointments list and existing status actions */}
      {view === "day" && <div className="px-5 space-y-3">
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
              className={cn("bg-card rounded-2xl border border-border/50 overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", !hasPhone(apt.client_phone) && "appointment-phone-missing")}
              onClick={() => updateSearch({ appointment: String(apt.id), view: "edit" }, false)}
            >
              <div className="flex">
                <div className="w-1.5 bg-primary/70 flex-shrink-0" />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{apt.client_name} <PhonePendingBadge phone={apt.client_phone}/></p>
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
                      <Button size="sm" className="h-7 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); updateSearch({ appointment: String(apt.id), view: "finalize" }, false); }}>Serviços / Finalizar</Button>
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
      </div>}

      <AppointmentForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingApt(null); updateSearch({ appointment: undefined, view: undefined }); }}
        onSubmit={handleSubmit}
        services={services}
        professionals={professionals}
        clients={clients}
        appointment={editingApt}
        initialDate={dateStr}
        initialTime={typeof search.time === "string" ? search.time : undefined}
        initialProfessional={typeof search.professional === "string" ? search.professional : undefined}
      />

      <FinalizeSheet
        open={!!finalizingApt}
        onClose={() => { setFinalizingApt(null); updateSearch({ appointment: undefined, view: undefined }); }}
        appointment={finalizingApt}
        services={services}
        canEditPrice
        onFinalized={() => queryClient.invalidateQueries({ queryKey: ["appointments"] })}
      />
    </div>
  );
}
