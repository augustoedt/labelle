import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RemindersApi } from "@/server/api";
import { MessageCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import { sendWhatsApp } from "@/lib/whatsapp";

const kindLabels = {
  agradecimento: "Agradecimento (20 dias)",
  reengajamento: "Reativação (45 dias)",
};

const statusLabels = {
  pendente: "Pendente",
  enviado: "Enviado",
  falhou: "Falhou",
  cancelado: "Cancelado",
};

const statusColors = {
  pendente: "bg-amber-100 text-amber-700",
  enviado: "bg-emerald-100 text-emerald-700",
  falhou: "bg-red-100 text-red-700",
  cancelado: "bg-muted text-muted-foreground",
};

// Lembretes pós-atendimento gerados automaticamente pelo backend (20 dias
// após o último atendimento + reativação a cada 45 dias). O botão "Enviar
// WhatsApp" tenta o envio automático pelo WhatsApp da empresa (WAHA); se não
// há provedor conectado, ou o envio falha, cai pro link wa.me manual.
export default function Reminders() {
  const [statusFilter, setStatusFilter] = useState("pendente");
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["client-reminders"],
    queryFn: () => RemindersApi.list({ sort: "-due_date", limit: 500 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["client-reminders"] });

  const markSentMutation = useMutation({
    mutationFn: (id) => RemindersApi.markSent({ id }),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => RemindersApi.cancel({ id }),
    onSuccess: invalidate,
  });

  const deliverMutation = useMutation({
    mutationFn: (reminder) => RemindersApi.deliver({ id: reminder.id }),
    onSuccess: invalidate,
    onError: (_error, reminder) => sendWhatsApp(reminder.client_phone, reminder.message),
  });

  const filtered = reminders.filter((r) => (statusFilter === "todos" ? true : r.status === statusFilter));
  const pendingCount = reminders.filter((r) => r.status === "pendente").length;

  const handleSend = (reminder) => {
    deliverMutation.mutate(reminder);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lembretes"
        subtitle={pendingCount > 0 ? `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}` : "Nenhum pendente"}
      />

      <div className="px-5 flex gap-2">
        {[
          { v: "pendente", l: "Pendentes" },
          { v: "enviado", l: "Enviados" },
          { v: "todos", l: "Todos" },
        ].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              statusFilter === v ? "bg-primary text-primary-foreground" : "bg-card border border-border/50"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="px-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p>Nenhum lembrete {statusFilter !== "todos" ? statusLabels[statusFilter]?.toLowerCase() : ""}</p>
            <p className="text-xs mt-1">
              Os lembretes são gerados automaticamente: 20 dias após o atendimento e a cada 45 dias sem retorno.
            </p>
          </div>
        ) : (
          filtered.map((reminder) => (
            <div key={reminder.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{reminder.client_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kindLabels[reminder.kind] || reminder.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {reminder.due_date && format(new Date(reminder.due_date + "T12:00"), "dd/MM/yyyy")}
                    {reminder.sent_via === "automatico" && " • enviado automaticamente"}
                  </p>
                </div>
                <Badge className={cn("text-xs border-0", statusColors[reminder.status])}>
                  {statusLabels[reminder.status]}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3 mt-3 whitespace-pre-line line-clamp-4">
                {reminder.message}
              </p>

              {reminder.status === "pendente" && (
                <div className="flex gap-1.5 mt-3">
                  <Button
                    size="sm"
                    className="h-8 text-xs rounded-lg gap-1"
                    disabled={deliverMutation.isPending && deliverMutation.variables?.id === reminder.id}
                    onClick={() => handleSend(reminder)}
                  >
                    <MessageCircle className="w-3 h-3" /> Enviar WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs rounded-lg gap-1 text-emerald-600"
                    onClick={() => markSentMutation.mutate(reminder.id)}
                  >
                    <Check className="w-3 h-3" /> Marcar enviado
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs rounded-lg gap-1 text-destructive"
                    onClick={() => cancelMutation.mutate(reminder.id)}
                  >
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
