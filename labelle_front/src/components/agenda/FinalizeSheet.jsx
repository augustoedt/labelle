import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ServiceVariantsApi,
  AppointmentsApi,
  AppointmentServicesApi,
} from "@/server/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, X } from "lucide-react";
import { formatBRL } from "@/lib/format";

const paymentMethods = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

// Painel do atendimento: gerencia os serviços realizados (inclusive os não
// previstos, adicionados durante o atendimento) e finaliza com a cobrança —
// o backend soma tudo e registra a transação como paga na forma escolhida.
export default function FinalizeSheet({
  open,
  onClose,
  appointment,
  services,
  onFinalized,
  onBookNext,
  canEditPrice = false,
}) {
  const queryClient = useQueryClient();
  const [bookNext,setBookNext]=useState(false);
  useEffect(()=>setBookNext(false),[appointment?.id,open]);
  const [addingServiceId, setAddingServiceId] = useState("");
  const [addingVariantId, setAddingVariantId] = useState("");
  const variantsQuery = useQuery({
    queryKey: ["service-variants"],
    queryFn: () => ServiceVariantsApi.list({ limit: 1000 }),
    enabled: open,
  });
  const options = (variantsQuery.data || []).filter(
    (v) => v.service_id === addingServiceId && v.is_active !== false,
  );
  const [paymentMethod, setPaymentMethod] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["appointment-services", appointment?.id],
    queryFn: () =>
      AppointmentServicesApi.list({
        filter: { appointment_id: appointment.id },
      }),
    enabled: open && !!appointment,
  });

  const invalidateItems = () =>
    queryClient.invalidateQueries({
      queryKey: ["appointment-services", appointment?.id],
    });

  const addMutation = useMutation({
    mutationFn: (serviceId) =>
      AppointmentServicesApi.create({
        data: {
          appointment_id: appointment.id,
          service_id: serviceId,
          ...(addingVariantId ? { service_variant_id: addingVariantId } : {}),
          unplanned: appointment.status === "em_atendimento",
        },
      }),
    onSuccess: () => {
      setAddingServiceId("");
      setAddingVariantId("");
      invalidateItems();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, price }) =>
      AppointmentServicesApi.update({ id, attributes: { price } }),
    onSuccess: invalidateItems,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => AppointmentServicesApi.delete({ id }),
    onSuccess: invalidateItems,
  });

  const finalizeMutation = useMutation({
    mutationFn: () =>
      AppointmentsApi.finalize({
        id: appointment.id,
        payment_method: paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["professional-appointments"],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onFinalized?.();
      onClose();
      if(bookNext) onBookNext?.(appointment);
    },
  });

  if (!appointment) return null;

  const total =
    (appointment.price || 0) + items.reduce((s, i) => s + (i.price || 0), 0);
  const availableServices = (services || []).filter((s) => {
    if (s.is_active === false || !variantsQuery.isSuccess) return false;
    const serviceVariants = (variantsQuery.data || []).filter(
      (variant) => variant.service_id === s.id,
    );
    return (
      serviceVariants.length === 0 ||
      serviceVariants.some((variant) => variant.is_active !== false)
    );
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] rounded-t-3xl overflow-y-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="font-heading">
            Atendimento — {appointment.client_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          {/* Serviços realizados */}
          <div className="space-y-2">
            <Label className="text-xs">Serviços realizados</Label>

            <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3 text-sm">
              <span>{appointment.service_name}</span>
              <span className="font-semibold tabular-nums">
                {formatBRL(appointment.price, { decimals: 2 })}
              </span>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-secondary/50 rounded-xl p-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{item.service_name}</span>
                  {item.unplanned && (
                    <Badge className="text-xs border-0 bg-amber-100 text-amber-700 mt-0.5">
                      Não previsto
                    </Badge>
                  )}
                </div>
                {canEditPrice ? (
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="w-24 h-8 text-right"
                    defaultValue={item.price ?? 0}
                    onBlur={(e) => {
                      const price = parseFloat(e.target.value);
                      if (!Number.isNaN(price) && price !== item.price) {
                        updateMutation.mutate({ id: item.id, price });
                      }
                    }}
                  />
                ) : (
                  <span className="font-medium tabular-nums">{formatBRL(item.price, { decimals: 2 })}</span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive flex-shrink-0"
                  onClick={() => removeMutation.mutate(item.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {/* Adicionar serviço (previsto ou não) */}
            <div className="flex gap-2">
              <Select
                value={addingServiceId}
                onValueChange={(id) => {
                  setAddingServiceId(id);
                  setAddingVariantId("");
                }}
              >
                <SelectTrigger className="flex-1" disabled={!variantsQuery.isSuccess}>
                  <SelectValue placeholder={variantsQuery.isSuccess ? "Adicionar serviço..." : "Carregando opções..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - {formatBRL(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="rounded-xl gap-1"
                disabled={
                  !addingServiceId ||
                  !availableServices.some((service) => service.id === addingServiceId) ||
                  addMutation.isPending ||
                  !variantsQuery.isSuccess ||
                  (options.length > 0 && !options.some((option) => option.id === addingVariantId))
                }
                onClick={() => addMutation.mutate(addingServiceId)}
              >
                <Plus className="w-4 h-4" /> Incluir
              </Button>
            </div>
          </div>

          {options.length > 0 && (
            <Select value={addingVariantId} onValueChange={setAddingVariantId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a opção do serviço adicional" />
              </SelectTrigger>
              <SelectContent>
                {options.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} — {formatBRL(v.price)} ({v.duration_minutes}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(addMutation.isError || variantsQuery.isError) && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível carregar ou incluir a opção do serviço. Tente
              novamente.
            </p>
          )}
          {/* Total */}
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3">
            <span className="text-sm font-medium">Total a cobrar</span>
            <span className="text-lg font-heading font-bold tracking-tight text-primary tabular-nums">
              {formatBRL(total, { decimals: 2 })}
            </span>
          </div>

          {/* Cobrança */}
          <div>
            <Label className="text-xs">Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {finalizeMutation.isError && (
            <p className="text-xs text-destructive">
              Não foi possível finalizar. Tente novamente.
            </p>
          )}

          {onBookNext && <label className="same-client-option"><input type="checkbox" checked={bookNext} onChange={e=>setBookNext(e.target.checked)}/><span>Agendar a próxima visita após concluir este atendimento</span></label>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl h-12 flex-1"
              onClick={onClose}
            >
              Salvar e voltar
            </Button>
            <Button
              className="rounded-xl h-12 flex-1 font-semibold"
              disabled={!paymentMethod || finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutate()}
            >
              {finalizeMutation.isPending
                ? "Finalizando..."
                : bookNext ? "Concluir e agendar próxima" : "Finalizar e cobrar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
