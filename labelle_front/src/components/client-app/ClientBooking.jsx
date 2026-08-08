import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServicesApi, ProfessionalsApi, ProfessionalServicesApi, PromotionsApi, AppointmentsApi, getAvailableSlots, upsertClient } from "@/server/api";
import { ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { normalizePhone } from "@/lib/clientUtils";
import { formatBRL } from "@/lib/format";
import { maskPhone } from "@/lib/phone";

const categoryEmojis = { cabelo: "💇", unha: "💅", estetica: "✨", sobrancelha: "🪒", maquiagem: "💄", outros: "🌟" };

export default function ClientBooking({ clientName, clientPhone, onSaveClient, onSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [formName, setFormName] = useState(clientName || "");
  const [formPhone, setFormPhone] = useState(clientPhone || "");
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: isLoadingServices } = useQuery({ queryKey: ["services"], queryFn: () => ServicesApi.list() });
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useQuery({ queryKey: ["professionals"], queryFn: () => ProfessionalsApi.list() });
  const { data: promotions = [] } = useQuery({ queryKey: ["promotions"], queryFn: () => PromotionsApi.list() });
  const { data: professionalServices = [] } = useQuery({
    queryKey: ["professional-services"],
    queryFn: () => ProfessionalServicesApi.list({ limit: 1000 }),
  });

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ["slots", selectedProfessional?.id, dateStr, selectedService?.duration_minutes],
    queryFn: () => getAvailableSlots({
      data: {
        professional_id: selectedProfessional.id,
        date: dateStr,
        duration_minutes: selectedService?.duration_minutes || 60,
        work_start: selectedProfessional.work_start || "09:00",
        work_end: selectedProfessional.work_end || "18:00",
      },
    }).then(r => r.slots || []),
    enabled: !!selectedProfessional && !!dateStr,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Upsert cliente via endpoint público (bypassa RLS, equivalente ao antigo service role)
      let client_id = null;
      try {
        const res = await upsertClient({ data: { name: data.client_name, phone: data.client_phone } });
        client_id = res?.client_id || null;
      } catch (_) { /* falha silenciosa — agendamento segue sem client_id */ }
      return AppointmentsApi.bookOnline({ data: { ...data, ...(client_id ? { client_id } : {}) } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      onSaveClient(formName, formPhone);
      // A confirmação de recebimento agora é enviada automaticamente pelo
      // backend (WhatsApp da empresa via WAHA, action :book_online do
      // Appointment) direto pra cliente — não abre mais o WhatsApp dela
      // pra ela mesma mandar mensagem pro estúdio.
      setStep(5);
    },
  });

  const getPromotion = (svcId) => promotions.find(p => p.is_active && p.service_id === svcId);

  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  const handleBook = () => {
    // Preço, duração, status e origem são calculados no backend (action
    // :book_online, que aplica a promoção ativa do serviço) — o app só
    // envia a identificação da cliente e o que ela escolheu.
    createMutation.mutate({
      client_name: formName, client_phone: normalizePhone(formPhone),
      professional_id: selectedProfessional.id,
      service_id: selectedService.id,
      date: format(selectedDate, "yyyy-MM-dd"), time: selectedTime,
    });
  };

  const isIdentified = !!(clientName && clientPhone);

  const goToConfirm = () => {
    if (isIdentified) {
      setFormName(clientName);
      setFormPhone(clientPhone);
      setStep(4);
    } else {
      setStep(4);
    }
  };

  const reset = () => { setStep(1); setSelectedService(null); setSelectedProfessional(null); setSelectedDate(null); setSelectedTime(null); };
  const activeServices = services.filter(s => s.is_active !== false);

  // Só mostra quem sabe fazer o serviço escolhido. Se ninguém estiver
  // vinculado ainda, a lista fica vazia de propósito — melhor bloquear o
  // agendamento desse serviço do que deixar marcar com uma profissional
  // que não sabe fazê-lo (ela acabaria recebendo comissão por um trabalho
  // que não realizou).
  const activeProfessionals = professionals
    .filter(p => p.is_active !== false)
    .filter(p => !selectedService || professionalServices.some(ps => ps.professional_id === p.id && ps.service_id === selectedService.id));

  return (
    <div className="px-5 py-5">
      {step < 5 && (
        <div className="flex gap-1 mb-5">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", s <= step ? "bg-foreground" : "bg-border")} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <h2 className="text-lg font-heading font-semibold">Escolha o serviço</h2>
            {isLoadingServices ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-2xl" />
              ))
            ) : (
            activeServices.map(svc => {
              const promo = getPromotion(svc.id);
              const finalPrice = promo ? (promo.discount_type === "percent" ? svc.price * (1 - promo.discount_value / 100) : svc.price - promo.discount_value) : svc.price;
              return (
                <button key={svc.id} onClick={() => setSelectedService(svc)}
                  className={cn("w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selectedService?.id === svc.id ? "border-foreground bg-foreground/5" : "border-border/50 bg-card")}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryEmojis[svc.category] || "🌟"}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{svc.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {svc.duration_minutes}min</p>
                    </div>
                    <div className="text-right">
                      {promo && <p className="text-xs line-through text-muted-foreground tabular-nums">{formatBRL(svc.price)}</p>}
                      <p className="font-heading font-bold tabular-nums">{formatBRL(finalPrice)}</p>
                    </div>
                  </div>
                </button>
              );
            })
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-heading font-semibold">Profissional</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">Voltar</Button>
            </div>
            {isLoadingProfessionals ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[76px] rounded-2xl" />
              ))
            ) : (
              <>
            {activeProfessionals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma profissional disponível para este serviço no momento.
              </p>
            )}
            {activeProfessionals.map(prof => (
              <button key={prof.id} onClick={() => { setSelectedProfessional(prof); setStep(3); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-border/50 bg-card hover:border-foreground/30 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
                  <span className="font-heading font-bold">{prof.name?.charAt(0)}</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">{prof.name}</p>
                  <p className="text-xs text-muted-foreground">{prof.work_start || "09:00"} – {prof.work_end || "18:00"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
              </>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold">Data e Horário</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs">Voltar</Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
              {availableDates.map(d => {
                const sel = selectedDate && format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                return (
                  <button key={d.toISOString()} onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
                    className={cn("flex flex-col items-center py-3 px-4 rounded-2xl min-w-[64px] border-2 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sel ? "border-foreground bg-foreground text-background" : "border-border/50 bg-card")}>
                    <span className="text-xs font-medium uppercase">{format(d, "EEE", { locale: ptBR })}</span>
                    <span className="text-xl font-bold">{format(d, "d")}</span>
                    <span className="text-xs">{format(d, "MMM", { locale: ptBR })}</span>
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <div>
                <p className="text-sm font-medium mb-2">Horários disponíveis</p>
                {isLoadingSlots
                  ? <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-xl" />
                    ))}
                  </div>
                  : slots.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-4">Sem horários neste dia</p>
                  : <div className="grid grid-cols-4 gap-2">
                    {slots.map(t => (
                      <button key={t} onClick={() => setSelectedTime(t)}
                        className={cn("py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selectedTime === t ? "border-foreground bg-foreground text-background" : "border-border/50 bg-card")}>
                        {t}
                      </button>
                    ))}
                  </div>}
              </div>
            )}
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold">Confirmar agendamento</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-xs">Voltar</Button>
            </div>

            {/* Resumo */}
            <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2 text-sm">
              {[["Serviço", selectedService?.name], ["Profissional", selectedProfessional?.name], ["Data", selectedDate && format(selectedDate, "dd/MM/yyyy")], ["Horário", selectedTime]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>
              ))}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Valor</span>
                <span className="font-heading font-bold text-lg tabular-nums">{formatBRL(selectedService?.price)}</span>
              </div>
            </div>

            {/* Dados do cliente: só mostra campos se NÃO identificado */}
            {isIdentified ? (
              <div className="bg-secondary/50 rounded-2xl p-4 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Agendando como</p>
                <p className="font-semibold">{formName}</p>
                <p className="text-muted-foreground text-xs">{formPhone}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div><Label className="text-xs">Nome completo</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Seu nome" className="mt-1 rounded-xl" /></div>
                <div><Label className="text-xs">WhatsApp</Label><Input value={formPhone} onChange={e => setFormPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1 rounded-xl" /></div>
              </div>
            )}

            {formPhone && normalizePhone(formPhone).length < 10 && (
              <p className="text-xs text-destructive text-center">Informe um telefone válido com DDD</p>
            )}
            <Button
              className="w-full rounded-xl h-12 font-semibold"
              onClick={handleBook}
              disabled={!formName || !formPhone || normalizePhone(formPhone).length < 10 || createMutation.isPending}
            >
              {createMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-16 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-foreground" />
            </div>
            <h2 className="text-2xl font-heading font-bold">Agendado! 🎉</h2>
            <p className="text-sm text-muted-foreground">Seu horário foi reservado. Aguarde a confirmação.</p>
            <Button variant="outline" className="rounded-xl" onClick={reset}>Fazer novo agendamento</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante "Continuar" (acima da barra inferior), aparece ao selecionar */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pointer-events-none z-40">
        <AnimatePresence>
          {(step === 1 && selectedService) || (step === 3 && selectedTime) ? (
            <motion.div
              key="floating-continue"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="flex justify-end"
            >
              <Button
                className="pointer-events-auto rounded-full h-12 px-6 font-semibold shadow-lg shadow-primary/30 gap-1"
                onClick={() => (step === 1 ? setStep(2) : goToConfirm())}
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
