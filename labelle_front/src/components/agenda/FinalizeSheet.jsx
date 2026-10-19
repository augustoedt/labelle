import AdditionalServices from "@/components/agenda/AdditionalServices";
import {appointmentCommission,commissionAllocations,roundMoney} from "@/lib/commissions";
import CommissionEditor from "@/components/agenda/CommissionEditor";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AppointmentsApi,
  AppointmentServicesApi,
} from "@/server/api";
import { Button } from "@/components/ui/button";
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
  const [paymentMethod, setPaymentMethod] = useState("");
  const [tipMode,setTipMode]=useState("amount");
  const [tipInput,setTipInput]=useState("");
  const [referral,setReferral]=useState(false);
  useEffect(()=>{setTipMode("amount");setTipInput("");setReferral(Boolean(appointment?.professional_referral));setPaymentMethod("");},[appointment?.id,open]);

  const { data: items = [] } = useQuery({
    queryKey: ["appointment-services", appointment?.id],
    queryFn: () =>
      AppointmentServicesApi.list({
        filter: { appointment_id: appointment.id },
      }),
    enabled: open && !!appointment,
  });

  const finalizeMutation = useMutation({
    mutationFn: () =>
      AppointmentsApi.finalize({
        id: appointment.id,
        payment_method: paymentMethod,
        tip_mode: tipMode,
        tip_input: Number(tipInput || 0),
        ...(canEditPrice ? {professional_referral:referral} : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["professional-appointments"],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["commission-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["commission-items"] });
      onFinalized?.();
      onClose();
      if(bookNext) onBookNext?.(appointment);
    },
  });

  if (!appointment) return null;

  const total =
    (appointment.price || 0) + items.reduce((s, i) => s + (i.price || 0), 0);
  const tipAmount=roundMoney(tipMode === "percent" ? total*Number(tipInput || 0)/100 : Number(tipInput || 0));
  const previewReferrer=referral ? appointment.professional_id : (appointment.referral_professional_id===appointment.professional_id ? null : appointment.referral_professional_id);
  const previewAppointment={...appointment,tip_amount:tipAmount,referral_professional_id:previewReferrer,referral_bonus_percent:previewReferrer ? (["debito","credito"].includes(paymentMethod) ? 10 : 15) : 0};
  const previewAllocations=commissionAllocations(previewAppointment,items);
  const commissionPreview=appointmentCommission(previewAppointment,items);

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

            <CommissionEditor record={appointment}/>
            <AdditionalServices appointment={appointment}/>
          </div>
          <div className="space-y-2 rounded-xl border p-3">
            <Label>Gorjeta — repassada integralmente à profissional</Label>
            <Select value={tipMode} onValueChange={setTipMode}><SelectTrigger aria-label="Tipo de gorjeta"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="amount">Valor em R$</SelectItem><SelectItem value="percent">Percentual dos serviços</SelectItem></SelectContent></Select>
            <Input aria-label="Gorjeta" type="number" min="0" step="0.01" value={tipInput} onChange={e=>setTipInput(e.target.value)} placeholder="0" />
            {canEditPrice && <label className="flex gap-2 text-sm"><input type="checkbox" checked={referral} onChange={e=>setReferral(e.target.checked)} />Cliente indicada por esta profissional — memorizar vínculo (admin)</label>}
            {previewReferrer && <p className="text-sm">Bônus de indicação: +{["debito","credito"].includes(paymentMethod) ? 10 : 15} pontos percentuais somente sobre os serviços executados por quem indicou a cliente. No cartão, a diferença de 5 pontos cobre a máquina; sem desconto adicional.</p>}
            <p className="text-sm">Gorjeta: {formatBRL(tipAmount,{decimals:2})} · Bônus: {formatBRL(commissionPreview.referralBonus,{decimals:2})} · Total de comissões da equipe: {formatBRL(commissionPreview.amount,{decimals:2})}{commissionPreview.missing ? " + comissão base pendente" : ""}</p>
            {previewAllocations.map(allocation=><p key={allocation.professional_id || "principal"} className="text-sm">{allocation.professional_name}: {formatBRL(allocation.amount,{decimals:2})}{allocation.referralBonus>0 ? ` (inclui bônus de ${formatBRL(allocation.referralBonus,{decimals:2})})` : ""}</p>)}
            <p className="text-xs text-muted-foreground">A gorjeta informada aqui é da profissional principal. Cada profissional recebe bônus de indicação somente sobre os serviços que ela mesma executou para uma cliente indicada por ela. A comissão base vem de cada serviço ou opção P/M/G. A gorjeta é somada à cobrança.</p>
          </div>
          {/* Total */}
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3">
            <span className="text-sm font-medium">Total a cobrar</span>
            <span className="text-lg font-heading font-bold tracking-tight text-primary tabular-nums">
              {formatBRL(total + tipAmount, { decimals: 2 })}
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
              Voltar
            </Button>
            <Button
              className="rounded-xl h-12 flex-1 font-semibold"
              disabled={!paymentMethod || !Number.isFinite(Number(tipInput)) || Number(tipInput)<0 || finalizeMutation.isPending}
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
