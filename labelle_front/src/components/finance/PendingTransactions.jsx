import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TransactionsApi } from "@/server/api";
import { Clock, CheckCircle2, XCircle, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ConfirmPaymentSheet from "./ConfirmPaymentSheet";

const STATUS_CONFIG = {
  pendente_confirmacao: { label: "Pendente", className: "bg-amber-50 border-amber-200", badge: "text-amber-600" },
  pagamento_parcial: { label: "Parcial", className: "bg-orange-50 border-orange-200", badge: "text-orange-600" },
};

export default function PendingTransactions({ transactions }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  const pending = transactions.filter(t =>
    t.status === "pendente_confirmacao" || t.status === "pagamento_parcial"
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => TransactionsApi.update({ id, attributes: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setEditing(null);
    },
  });

  const handleEdit = (t) => {
    setEditForm({ description: t.description, amount: t.amount });
    setEditing(t);
  };

  const handleEditSubmit = () => {
    updateMutation.mutate({
      id: editing.id,
      data: { description: editForm.description, amount: parseFloat(editForm.amount) },
    });
  };

  const handleCancel = (t) => {
    updateMutation.mutate({ id: t.id, data: { status: "cancelado" } });
  };

  if (pending.length === 0) return null;

  return (
    <>
      <div className="px-5 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Pendentes de confirmação ({pending.length})
          </h3>
        </div>

        {pending.map((t) => {
          const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pendente_confirmacao;
          return (
            <div key={t.id} className={cn("border rounded-xl p-3 space-y-2", cfg.className)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {t.status === "pagamento_parcial" && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                    <p className="text-sm font-medium truncate">{t.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.date && format(new Date(t.date + "T12:00"), "dd/MM/yyyy")}
                    {" • "}<span className={cn("font-medium", cfg.badge)}>{cfg.label}</span>
                  </p>
                </div>
                <p className="font-semibold text-sm text-amber-700 ml-2">R$ {(t.amount || 0).toFixed(2)}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 gap-1"
                  onClick={() => setConfirming(t)}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {t.status === "pagamento_parcial" ? "Completar" : "Confirmar"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={() => handleEdit(t)}>
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-destructive gap-1" onClick={() => handleCancel(t)}>
                  <XCircle className="w-3 h-3" /> Cancelar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm with multiple payments */}
      <ConfirmPaymentSheet
        transaction={confirming}
        open={!!confirming}
        onClose={() => setConfirming(null)}
      />

      {/* Edit description/amount only */}
      <Sheet open={!!editing} onOpenChange={() => setEditing(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">Editar Lançamento</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-8">
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={editForm.description || ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">Valor Total (R$)</Label>
              <Input type="number" value={editForm.amount || ""} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button className="w-full rounded-xl h-12 font-semibold" onClick={handleEditSubmit} disabled={updateMutation.isPending}>
              Salvar Alterações
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
