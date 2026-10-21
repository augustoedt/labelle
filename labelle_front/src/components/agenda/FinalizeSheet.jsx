import AdditionalServices from "@/components/agenda/AdditionalServices";
import {appointmentCommission,commissionAllocations,roundMoney} from "@/lib/commissions";
import CommissionEditor from "@/components/agenda/CommissionEditor";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient,useIsMutating } from "@tanstack/react-query";
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
// o backend soma tudo e registra a cobrança e o valor recebido.
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
  const changingItems=useIsMutating({mutationKey:["service-item-change",appointment?.id]});
  const [bookNext,setBookNext]=useState(false);
  useEffect(()=>setBookNext(false),[appointment?.id,open]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus,setPaymentStatus]=useState("pago");
  const [amountPaid,setAmountPaid]=useState("");
  const [tipMode,setTipMode]=useState("amount");
  const [tipInput,setTipInput]=useState("");
  const [referral,setReferral]=useState(false);
  useEffect(()=>{setTipMode("amount");setTipInput("");setReferral(Boolean(appointment?.professional_referral));setPaymentMethod("");setPaymentStatus("pago");setAmountPaid("");},[appointment?.id,open]);

  const { data: items = [],isPending:loadingItems,isError:itemsError } = useQuery({
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
        payment_method: paymentStatus === "pendente_confirmacao" ? undefined : paymentMethod,
        payment_status:paymentStatus,
        ...(paymentStatus === "pagamento_parcial" ? {amount_paid:Number(amountPaid)} : {}),
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
      queryClient.invalidateQueries({ queryKey: ["payments"] });
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

  return <Sheet open={open} onOpenChange={onClose}>
    <SheetContent side="bottom" className="finalize-sheet">
      <SheetHeader className="finalize-header"><SheetTitle>Atendimento — {appointment.client_name}</SheetTitle></SheetHeader>
      <div className="finalize-body">
        <section className="finalize-services">
          <h3>Serviços</h3>
          <div className="finalize-primary"><div><strong>{appointment.service_name}</strong><span>{appointment.professional_name}</span></div><strong>{formatBRL(appointment.price,{decimals:2})}</strong></div>
          <CommissionEditor compact record={appointment}/>
          <AdditionalServices appointment={appointment}/>
        </section>
        <section className="finalize-payment">
          <h3>Pagamento</h3>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}><SelectTrigger aria-label="Situação do pagamento"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pago">Pago integralmente</SelectItem><SelectItem value="pagamento_parcial">Pagamento parcial</SelectItem><SelectItem value="pendente_confirmacao">Pagamento pendente</SelectItem></SelectContent></Select>
          {paymentStatus !== "pendente_confirmacao" && <Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger aria-label="Forma de pagamento"><SelectValue placeholder="Forma de pagamento"/></SelectTrigger><SelectContent>{paymentMethods.map(m=><SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select>}
          {paymentStatus === "pagamento_parcial" && <div><Label>Valor recebido</Label><Input aria-label="Valor recebido" type="number" min="0.01" max={total+tipAmount} step="0.01" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} placeholder="0,00"/></div>}
          {paymentStatus !== "pago" && <div className="text-sm font-semibold text-amber-700">Saldo pendente: {formatBRL(Math.max(0,total+tipAmount-(paymentStatus === "pagamento_parcial" ? Number(amountPaid || 0) : 0)),{decimals:2})}</div>}
          <Label>Gorjeta</Label>
          <div className="finalize-tip"><Select value={tipMode} onValueChange={setTipMode}><SelectTrigger aria-label="Tipo de gorjeta"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="amount">R$</SelectItem><SelectItem value="percent">%</SelectItem></SelectContent></Select><Input aria-label="Gorjeta" type="number" min="0" step="0.01" value={tipInput} onChange={e=>setTipInput(e.target.value)} placeholder="0,00"/></div>
          {canEditPrice && <label className="finalize-check"><input type="checkbox" checked={referral} onChange={e=>setReferral(e.target.checked)}/>Cliente da profissional</label>}
          <div className="finalize-commissions"><div><span>Comissões</span><strong>{formatBRL(commissionPreview.amount,{decimals:2})}</strong></div>{previewAllocations.map(a=><div key={a.professional_id || "principal"}><span>{a.professional_name}</span><span>{formatBRL(a.amount,{decimals:2})}</span></div>)}{commissionPreview.referralBonus>0 && <div><span>Bônus de indicação</span><span>{formatBRL(commissionPreview.referralBonus,{decimals:2})}</span></div>}{commissionPreview.missing && <p role="status">Comissão pendente</p>}</div>
          {onBookNext && <label className="finalize-check"><input type="checkbox" checked={bookNext} onChange={e=>setBookNext(e.target.checked)}/>Agendar próxima visita</label>}
          {(finalizeMutation.isError || itemsError) && <p role="alert">Não foi possível concluir. Tente novamente.</p>}
        </section>
      </div>
      <footer className="finalize-footer"><div><span>Total a cobrar</span><strong>{formatBRL(total+tipAmount,{decimals:2})}</strong></div><Button variant="outline" onClick={onClose}>Voltar</Button><Button disabled={(paymentStatus !== "pendente_confirmacao" && !paymentMethod) || (paymentStatus === "pagamento_parcial" && (!Number.isFinite(Number(amountPaid)) || Number(amountPaid)<=0 || Number(amountPaid)>=total+tipAmount)) || loadingItems || itemsError || changingItems>0 || !Number.isFinite(Number(tipInput)) || Number(tipInput)<0 || finalizeMutation.isPending} onClick={()=>finalizeMutation.mutate()}>{finalizeMutation.isPending?"Finalizando…":"Finalizar"}</Button></footer>
    </SheetContent>
  </Sheet>;
}
