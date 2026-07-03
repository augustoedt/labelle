import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TransactionsApi, PaymentsApi } from "@/server/api";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const METHOD_LABELS = {
  pix: "Pix", dinheiro: "Dinheiro", debito: "Débito",
  credito: "Crédito", voucher: "Voucher", cortesia: "Cortesia", outro: "Outro",
};

const CARD_BRANDS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outra"];

function newPaymentLine() {
  return { method: "pix", amount: "", fee_percent: 0, installments: 1, card_brand: "" };
}

function calcFee(amount, percent) {
  const a = parseFloat(amount) || 0;
  const p = parseFloat(percent) || 0;
  return parseFloat((a * p / 100).toFixed(2));
}

export default function ConfirmPaymentSheet({ transaction, open, onClose }) {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState([newPaymentLine()]);

  useEffect(() => {
    if (open && transaction) {
      setLines([{ ...newPaymentLine(), amount: transaction.amount || "" }]);
    }
  }, [open, transaction]);

  const total = parseFloat(transaction?.amount) || 0;
  const sumPaid = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalFees = lines.reduce((s, l) => s + calcFee(l.amount, l.fee_percent), 0);
  const netAmount = sumPaid - totalFees;
  const remaining = parseFloat((total - sumPaid).toFixed(2));
  const isOver = remaining < -0.01;
  const isExact = Math.abs(remaining) < 0.01;
  const isPartial = remaining > 0.01;

  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const addLine = () => setLines(prev => [...prev, newPaymentLine()]);

  const txMutation = useMutation({
    mutationFn: ({ id, data }) => TransactionsApi.update({ id, attributes: data }),
  });

  const payMutation = useMutation({
    mutationFn: (data) => PaymentsApi.create({ data }),
  });

  const handleConfirm = async () => {
    if (isOver) return;

    const newStatus = isExact ? "pago" : "pagamento_parcial";
    const mainMethod = lines.length === 1 ? lines[0].method : "multiplo";

    // Update transaction
    await txMutation.mutateAsync({
      id: transaction.id,
      data: {
        status: newStatus,
        payment_method: mainMethod,
        net_amount: parseFloat(netAmount.toFixed(2)),
        total_fees: parseFloat(totalFees.toFixed(2)),
      },
    });

    // Create payment records
    for (const line of lines) {
      const feeAmt = calcFee(line.amount, line.fee_percent);
      await payMutation.mutateAsync({
        transaction_id: transaction.id,
        appointment_id: transaction.appointment_id || "",
        client_id: transaction.client_id || "",
        professional_id: transaction.professional_id || "",
        payment_date: transaction.date,
        payment_method: line.method,
        amount: parseFloat(line.amount) || 0,
        fee_percent: parseFloat(line.fee_percent) || 0,
        fee_amount: feeAmt,
        net_amount: parseFloat((parseFloat(line.amount || 0) - feeAmt).toFixed(2)),
        installments: parseInt(line.installments) || 1,
        card_brand: line.card_brand || "",
        status: "confirmado",
        origin: "manual",
      });
    }

    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    onClose();
  };

  const isCard = (method) => method === "credito" || method === "debito";
  const isBusy = txMutation.isPending || payMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[92vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="font-heading">Confirmar Pagamento</SheetTitle>
        </SheetHeader>

        {transaction && (
          <div className="space-y-4 pb-8">
            {/* Service summary */}
            <div className="bg-secondary/50 rounded-xl p-3 text-sm">
              <p className="font-medium truncate">{transaction.description}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{transaction.date}</p>
            </div>

            {/* Totals bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card rounded-xl border border-border/50 p-2">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="font-semibold text-sm">R$ {total.toFixed(2)}</p>
              </div>
              <div className="bg-card rounded-xl border border-border/50 p-2">
                <p className="text-[10px] text-muted-foreground">Informado</p>
                <p className={cn("font-semibold text-sm", isOver ? "text-destructive" : isExact ? "text-emerald-600" : "text-amber-600")}>
                  R$ {sumPaid.toFixed(2)}
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border/50 p-2">
                <p className="text-[10px] text-muted-foreground">{isOver ? "Excesso" : "Restante"}</p>
                <p className={cn("font-semibold text-sm", isOver ? "text-destructive" : isPartial ? "text-amber-600" : "text-emerald-600")}>
                  R$ {Math.abs(remaining).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Alert */}
            {isOver && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Valor informado excede o total. Ajuste os valores.
              </div>
            )}
            {isPartial && !isOver && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Pagamento parcial: faltam R$ {remaining.toFixed(2)}. O lançamento ficará como "Pagamento Parcial".
              </div>
            )}

            {/* Payment lines */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Composição do Pagamento</p>

              {lines.map((line, idx) => (
                <div key={idx} className="bg-card rounded-xl border border-border/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Forma {idx + 1}</p>
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(idx)} className="text-destructive/70 hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Forma</Label>
                      <Select value={line.method} onValueChange={v => updateLine(idx, "method", v)}>
                        <SelectTrigger className="mt-0.5 rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(METHOD_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Valor (R$)</Label>
                      <Input
                        type="number"
                        value={line.amount}
                        onChange={e => updateLine(idx, "amount", e.target.value)}
                        className="mt-0.5 rounded-lg h-8 text-xs"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Taxa (%)</Label>
                      <Input
                        type="number"
                        value={line.fee_percent}
                        onChange={e => updateLine(idx, "fee_percent", e.target.value)}
                        className="mt-0.5 rounded-lg h-8 text-xs"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Vlr. Líquido</Label>
                      <div className="mt-0.5 h-8 rounded-lg border border-border/50 bg-secondary/30 px-2 flex items-center text-xs text-muted-foreground">
                        R$ {(parseFloat(line.amount || 0) - calcFee(line.amount, line.fee_percent)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {isCard(line.method) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Parcelas</Label>
                        <Select value={String(line.installments)} onValueChange={v => updateLine(idx, "installments", v)}>
                          <SelectTrigger className="mt-0.5 rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Bandeira</Label>
                        <Select value={line.card_brand} onValueChange={v => updateLine(idx, "card_brand", v)}>
                          <SelectTrigger className="mt-0.5 rounded-lg h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {CARD_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" size="sm" className="w-full rounded-xl gap-1.5 text-xs" onClick={addLine}>
                <Plus className="w-3.5 h-3.5" /> Adicionar forma de pagamento
              </Button>
            </div>

            {/* Fee summary */}
            {totalFees > 0 && (
              <div className="bg-secondary/30 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valor bruto</span><span>R$ {sumPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Total taxas</span><span>- R$ {totalFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600">
                  <span>Valor líquido</span><span>R$ {netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full rounded-xl h-12 font-semibold bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={handleConfirm}
              disabled={isBusy || isOver || lines.some(l => !l.amount || parseFloat(l.amount) <= 0)}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isBusy ? "Salvando..." : isPartial ? "Confirmar Pagamento Parcial" : "Confirmar Pagamento"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
