import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ServiceVariantsApi,
  ServicesApi,
  ProfessionalsApi,
  ProfessionalServicesApi,
  PromotionsApi,
  AppointmentsApi,
  getAvailableSlots,
  upsertClient,
} from "@/server/api";
import { ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import ServiceCategoryIcon from "@/components/ui/ServiceCategoryIcon";
import { normalizePhone } from "@/lib/clientUtils";
import { formatBRL } from "@/lib/format";
import {
  activeVariants,
  minimumPrice,
  finalPrice,
  promotionFor,
  normalizeSearch,
  availableService,
} from "@/lib/serviceCatalog";
import { maskPhone } from "@/lib/phone";

export default function ClientBooking({
  clientName,
  clientPhone,
  onSaveClient,
  onSuccess,
  initialSelection,
  onClearSelection,
}) {
  const [step, setStep] = useState(1);
  const [serviceSearch, setServiceSearch] = useState("");
  const prefersReduced = useReducedMotion();
  const [selectedService, setSelectedService] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [formName, setFormName] = useState(clientName || "");
  const [formPhone, setFormPhone] = useState(clientPhone || "");
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });
  const { data: professionals = [], isLoading: isLoadingProfessionals } =
    useQuery({
      queryKey: ["professionals"],
      queryFn: () => ProfessionalsApi.list(),
    });
  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => PromotionsApi.list(),
  });
  const { data: professionalServices = [] } = useQuery({
    queryKey: ["professional-services"],
    queryFn: () => ProfessionalServicesApi.list({ limit: 1000 }),
  });

  const variantsQuery = useQuery({
    queryKey: ["service-variants"],
    queryFn: () => ServiceVariantsApi.list({ limit: 1000 }),
  });
  const variants = variantsQuery.data || [];
  const options = selectedService
    ? activeVariants(variants, selectedService.id)
    : [];
  const selectedOption = selectedVariant || selectedService;
  const ready =
    !!selectedService &&
    (options.length === 0 || !!selectedVariant) &&
    variantsQuery.isSuccess;
  useEffect(() => {
    if (!initialSelection || !services.length || !variantsQuery.isSuccess)
      return;
    const service = services.find(
      (s) => s.id === initialSelection.serviceId && s.is_active !== false,
    );
    setSelectedService(service || null);
    const variant =
      variants.find(
        (v) =>
          v.id === initialSelection.variantId &&
          v.service_id === service?.id &&
          v.is_active !== false,
      ) || null;
    setSelectedVariant(variant);
    if (
      service &&
      (variant || activeVariants(variants, service.id).length === 0)
    )
      setStep(2);
  }, [initialSelection, services, variantsQuery.data]);
  const chooseService = (svc) => {
    setSelectedService(svc);
    setSelectedVariant(null);
    setSelectedProfessional(null);
    setSelectedDate(null);
    setSelectedTime(null);
    onClearSelection?.();
  };
  const chooseVariant = (value) => {
    setSelectedVariant(value);
    setSelectedProfessional(null);
    setSelectedDate(null);
    setSelectedTime(null);
  };
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: [
      "slots",
      selectedProfessional?.id,
      dateStr,
      selectedOption?.duration_minutes,
    ],
    queryFn: () =>
      getAvailableSlots({
        data: {
          professional_id: selectedProfessional.id,
          date: dateStr,
          duration_minutes: selectedOption?.duration_minutes || 60,
          work_start: selectedProfessional.work_start || "09:00",
          work_end: selectedProfessional.work_end || "18:00",
        },
      }).then((r) =>
        (r.slots || []).filter(
          (time) => new Date(`${dateStr}T${time}-03:00`) > new Date(),
        ),
      ),
    enabled: !!selectedProfessional && !!dateStr,
  });

  const createMutation = useMutation({
    mutationFn: (data) => AppointmentsApi.bookOnline({ data }),
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

  const getPromotion = (svcId) => promotionFor(promotions, svcId);

  const availableDates = Array.from({ length: 14 }, (_, i) =>
    addDays(new Date(), i),
  );

  const handleBook = () => {
    // Preço, duração, status e origem são calculados no backend (action
    // :book_online, que aplica a promoção ativa do serviço) — o app só
    // envia a identificação da cliente e o que ela escolheu.
    createMutation.mutate({
      client_name: formName,
      client_phone: normalizePhone(formPhone),
      professional_id: selectedProfessional.id,
      service_id: selectedService.id,
      ...(selectedVariant ? { service_variant_id: selectedVariant.id } : {}),
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime,
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

  const reset = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedVariant(null);
    onClearSelection?.();
    setSelectedProfessional(null);
    setSelectedDate(null);
    setSelectedTime(null);
  };
  const activeServices = services.filter(
    (s) =>
      availableService(s, variants) &&
      normalizeSearch(s.name).includes(normalizeSearch(serviceSearch)),
  );

  // Só mostra quem sabe fazer o serviço escolhido. Se ninguém estiver
  // vinculado ainda, a lista fica vazia de propósito — melhor bloquear o
  // agendamento desse serviço do que deixar marcar com uma profissional
  // que não sabe fazê-lo (ela acabaria recebendo comissão por um trabalho
  // que não realizou).
  const activeProfessionals = professionals
    .filter((p) => p.is_active !== false)
    .filter(
      (p) =>
        !selectedService ||
        professionalServices.some(
          (ps) =>
            ps.professional_id === p.id && ps.service_id === selectedService.id,
        ),
    );

  return (
    <div className="px-5 py-5 pb-32">
      {step < 5 && (
        <ol className="booking-steps" aria-label="Etapas do agendamento">
          {["Serviço", "Profissional", "Horário", "Confirmação"].map(
            (label, index) => (
              <li
                key={label}
                className={index + 1 <= step ? "current" : ""}
                aria-current={index + 1 === step ? "step" : undefined}
              >
                <span>{index + 1}</span>
                {label}
              </li>
            ),
          )}
        </ol>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: prefersReduced === true ? 0 : 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="space-y-3"
          >
            <h2 className="text-lg font-heading font-semibold tracking-tight">
              Escolha o serviço
            </h2>
            <Input
              className="booking-search"
              aria-label="Buscar serviço para agendar"
              placeholder="Buscar serviço..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
            />
            {isLoadingServices
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] rounded-2xl" />
                ))
              : activeServices.map((svc, i) => {
                  const promo = getPromotion(svc.id);
                  const displayPrice = minimumPrice(svc, variants, promo);
                  return (
                    <Reveal key={svc.id} index={i} className="w-full">
                      <button
                        onClick={() => chooseService(svc)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selectedService?.id === svc.id
                            ? "border-primary bg-secondary"
                            : "border-border/50 bg-card",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/70 text-foreground">
                            <ServiceCategoryIcon
                              category={svc.category}
                              className="w-5 h-5"
                            />
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{svc.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />{" "}
                              {svc.duration_minutes}min
                            </p>
                          </div>
                          <div className="text-right">
                            {promo && (
                              <p className="text-xs line-through text-muted-foreground tabular-nums">
                                {formatBRL(svc.price)}
                              </p>
                            )}
                            <p className="font-heading font-bold tracking-tight tabular-nums">
                              {activeVariants(variants, svc.id).length > 0 && (
                                <span className="block text-xs font-normal">
                                  A partir de
                                </span>
                              )}
                              {formatBRL(displayPrice)}
                            </p>
                          </div>
                        </div>
                      </button>
                    </Reveal>
                  );
                })}
          </motion.div>
        )}

        {step === 1 && selectedService && (
          <div className="mt-5 space-y-3">
            {variantsQuery.isPending && <p>Carregando opções...</p>}
            {variantsQuery.isError && (
              <div role="alert">
                Não foi possível carregar as opções.{" "}
                <button onClick={() => variantsQuery.refetch()}>
                  Tentar novamente
                </button>
              </div>
            )}
            {options.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="font-semibold mb-2">
                  Opção de {selectedService.name}
                </legend>
                {options.map((v) => (
                  <label
                    key={v.id}
                    className={cn(
                      "flex items-center gap-3 border rounded-xl p-3 bg-card",
                      selectedVariant?.id === v.id &&
                        "border-primary bg-secondary",
                    )}
                  >
                    <input
                      name="booking-variant"
                      type="radio"
                      checked={selectedVariant?.id === v.id}
                      onChange={() => chooseVariant(v)}
                    />
                    <span className="flex-1">
                      <strong>{v.name}</strong>
                      <span className="block text-xs text-muted-foreground">
                        {v.description} · {v.duration_minutes} min
                      </span>
                    </span>
                    <strong>
                      {formatBRL(
                        finalPrice(v, getPromotion(selectedService.id)),
                      )}
                    </strong>
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        )}

        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: prefersReduced === true ? 0 : 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-heading font-semibold tracking-tight">
                Profissional
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs"
              >
                Voltar
              </Button>
            </div>
            {isLoadingProfessionals ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[76px] rounded-2xl" />
              ))
            ) : (
              <>
                {activeProfessionals.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma profissional disponível para este serviço no
                    momento.
                  </p>
                )}
                {activeProfessionals.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => {
                      setSelectedProfessional(prof);
                      setSelectedDate(null);
                      setSelectedTime(null);
                      setStep(3);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-border/50 bg-card hover:border-foreground/30 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
                      <span className="font-heading font-bold tracking-tight">
                        {prof.name?.charAt(0)}
                      </span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm">{prof.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prof.work_start || "09:00"} –{" "}
                        {prof.work_end || "18:00"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: prefersReduced === true ? 0 : 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold tracking-tight">
                Data e Horário
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                className="text-xs"
              >
                Voltar
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
              {availableDates.map((d) => {
                const sel =
                  selectedDate &&
                  format(d, "yyyy-MM-dd") ===
                    format(selectedDate, "yyyy-MM-dd");
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                    className={cn(
                      "flex flex-col items-center py-3 px-4 rounded-2xl min-w-[64px] border-2 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sel
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/50 bg-card",
                    )}
                  >
                    <span className="text-xs font-medium uppercase">
                      {format(d, "EEE", { locale: ptBR })}
                    </span>
                    <span className="text-xl font-bold">{format(d, "d")}</span>
                    <span className="text-xs">
                      {format(d, "MMM", { locale: ptBR })}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <div>
                <p className="text-sm font-medium mb-2">Horários disponíveis</p>
                {isLoadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-xl" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sem horários neste dia
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          "py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selectedTime === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/50 bg-card",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="s4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: prefersReduced === true ? 0 : 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold tracking-tight">
                Confirmar agendamento
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(3)}
                className="text-xs"
              >
                Voltar
              </Button>
            </div>

            {/* Resumo */}
            <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2 text-sm">
              {[
                [
                  "Serviço",
                  [selectedService?.name, selectedVariant?.name]
                    .filter(Boolean)
                    .join(" — "),
                ],
                ["Profissional", selectedProfessional?.name],
                ["Data", selectedDate && format(selectedDate, "dd/MM/yyyy")],
                ["Horário", selectedTime],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Valor</span>
                <span className="font-heading font-bold tracking-tight text-lg tabular-nums">
                  {formatBRL(
                    finalPrice(
                      selectedOption,
                      getPromotion(selectedService?.id),
                    ),
                  )}
                </span>
              </div>
            </div>

            {/* Dados do cliente: só mostra campos se NÃO identificado */}
            {isIdentified ? (
              <div className="bg-secondary/50 rounded-2xl p-4 text-sm">
                <p className="text-muted-foreground text-xs mb-1">
                  Agendando como
                </p>
                <p className="font-semibold">{formName}</p>
                <p className="text-muted-foreground text-xs">{formPhone}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome completo</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Seu nome"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp</Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>
            )}

            {formPhone && normalizePhone(formPhone).length < 10 && (
              <p className="text-xs text-destructive text-center">
                Informe um telefone válido com DDD
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              A solicitação ficará aguardando confirmação do salão.
            </p>
            {createMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                Não foi possível solicitar este horário. Confira a
                disponibilidade e tente novamente.
              </p>
            )}
            <Button
              className="w-full rounded-full h-12 font-semibold"
              onClick={handleBook}
              disabled={
                !formName ||
                !formPhone ||
                normalizePhone(formPhone).length < 10 ||
                createMutation.isPending
              }
            >
              {createMutation.isPending
                ? "Agendando..."
                : "Solicitar agendamento"}
            </Button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="s5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: prefersReduced === true ? 0 : 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="py-16 text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-foreground" />
            </div>
            <h2 className="text-2xl font-heading font-bold tracking-tight">
              Solicitação enviada
            </h2>
            <p className="text-sm text-muted-foreground">
              O salão vai conferir a agenda e confirmar seu atendimento. Você
              pode acompanhar em Histórico.
            </p>
            <Button className="rounded-full" onClick={onSuccess}>
              Ver meus agendamentos
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={reset}>
              Fazer novo agendamento
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante "Continuar" acima da barra inferior */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-3xl px-5 pointer-events-none z-40">
        <AnimatePresence>
          {(step === 1 && ready) || (step === 3 && selectedTime) ? (
            <motion.div
              key="floating-continue"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="flex justify-end"
            >
              <Button
                className="pointer-events-auto rounded-full h-12 px-6 font-semibold shadow-lg shadow-primary/30 gap-2"
                onClick={() => (step === 1 ? setStep(2) : goToConfirm())}
              >
                Continuar
                <span className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
