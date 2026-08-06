import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServicesApi, ProfessionalsApi, AppointmentsApi, PromotionsApi } from "@/server/api";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ServiceCard from "@/components/portal/ServiceCard";

export default function ClientPortal() {
  const [step, setStep] = useState(1); // 1=services, 2=professional, 3=datetime, 4=info, 5=success
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientInfo, setClientInfo] = useState({ name: "", phone: "" });
  const queryClient = useQueryClient();

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => PromotionsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => AppointmentsApi.bookOnline({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setStep(5);
    },
  });

  const activeServices = services.filter(s => s.is_active !== false);
  const activeProfessionals = professionals.filter(p => p.is_active !== false);

  const getPromotionForService = (svcId) => {
    return promotions.find(p => p.is_active && p.service_id === svcId);
  };

  // Available dates (next 14 days)
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // Available time slots
  const getAvailableSlots = () => {
    if (!selectedProfessional || !selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const profStart = selectedProfessional.work_start || "09:00";
    const profEnd = selectedProfessional.work_end || "18:00";
    const duration = selectedService?.duration_minutes || 60;

    const existingAppts = appointments.filter(
      a => a.date === dateStr && a.professional_id === selectedProfessional.id && a.status !== "cancelado"
    );

    const slots = [];
    const [startH, startM] = profStart.split(":").map(Number);
    const [endH, endM] = profEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
      const hour = Math.floor(m / 60);
      const min = m % 60;
      const slotTime = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotEnd = m + duration;

      const hasConflict = existingAppts.some(a => {
        const [aH, aM] = (a.time || "00:00").split(":").map(Number);
        const aStart = aH * 60 + aM;
        const aEnd = aStart + (a.duration_minutes || 60);
        return m < aEnd && slotEnd > aStart;
      });

      if (!hasConflict) {
        slots.push(slotTime);
      }
    }
    return slots;
  };

  const handleBook = () => {
    // Preço, duração, status e origem são calculados no backend (action
    // :book_online, que aplica a promoção ativa do serviço) — o app só
    // envia a identificação da cliente e o que ela escolheu.
    createMutation.mutate({
      client_name: clientInfo.name,
      client_phone: clientInfo.phone,
      professional_id: selectedProfessional.id,
      service_id: selectedService.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime,
    });
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setClientInfo({ name: "", phone: "" });
  };

  const availableSlots = getAvailableSlots();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 px-5 pt-10 pb-8 text-center">
        <h1 className="text-3xl font-heading font-bold">La Belle Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Agende seu horário</p>
      </div>

      {/* Progress */}
      {step < 5 && (
        <div className="px-5 py-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", s <= step ? "bg-primary" : "bg-border")} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Services */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 space-y-3">
            <h2 className="text-lg font-heading font-semibold">Escolha o serviço</h2>
            {activeServices.map(svc => (
              <ServiceCard
                key={svc.id}
                service={svc}
                selected={selectedService?.id === svc.id}
                onSelect={(s) => { setSelectedService(s); }}
                promotion={getPromotionForService(svc.id)}
              />
            ))}
            {selectedService && (
              <Button className="w-full rounded-xl h-12 font-semibold mt-4" onClick={() => setStep(2)}>
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </motion.div>
        )}

        {/* Step 2: Professional */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold">Escolha o profissional</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">Voltar</Button>
            </div>
            {activeProfessionals.map(prof => (
              <button
                key={prof.id}
                onClick={() => { setSelectedProfessional(prof); setStep(3); }}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                  selectedProfessional?.id === prof.id ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-primary/30"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-heading font-bold text-primary">{prof.name?.charAt(0)}</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold">{prof.name}</p>
                  <p className="text-xs text-muted-foreground">{prof.work_start || "09:00"} - {prof.work_end || "18:00"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </motion.div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold">Data e Horário</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs">Voltar</Button>
            </div>

            {/* Date selection */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
              {availableDates.map(d => {
                const isSelected = selectedDate && format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
                    className={cn(
                      "flex flex-col items-center py-3 px-4 rounded-2xl min-w-[70px] transition-all border-2",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card"
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase">{format(d, "EEE", { locale: ptBR })}</span>
                    <span className="text-xl font-bold">{format(d, "d")}</span>
                    <span className="text-[10px]">{format(d, "MMM", { locale: ptBR })}</span>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <p className="text-sm font-medium mb-2">Horários disponíveis</p>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem horários disponíveis neste dia</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          "py-2.5 rounded-xl text-sm font-medium transition-all border-2",
                          selectedTime === t ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card hover:border-primary/30"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTime && (
              <Button className="w-full rounded-xl h-12 font-semibold" onClick={() => setStep(4)}>
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </motion.div>
        )}

        {/* Step 4: Client Info */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold">Seus dados</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-xs">Voltar</Button>
            </div>

            {/* Summary */}
            <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Serviço</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profissional</span>
                <span className="font-medium">{selectedProfessional?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{selectedDate && format(selectedDate, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Valor</span>
                <span className="font-heading font-bold text-lg">R$ {selectedService?.price}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={clientInfo.name} onChange={e => setClientInfo(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome completo" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <Input value={clientInfo.phone} onChange={e => setClientInfo(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>

            <Button
              className="w-full rounded-xl h-12 font-semibold"
              onClick={handleBook}
              disabled={!clientInfo.name || !clientInfo.phone || createMutation.isPending}
            >
              {createMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </motion.div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-5 py-12 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-heading font-bold">Agendado!</h2>
            <p className="text-sm text-muted-foreground">Seu horário foi reservado com sucesso. Aguarde a confirmação do salão.</p>
            <Button variant="outline" className="rounded-xl" onClick={resetBooking}>
              Fazer Outro Agendamento
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
