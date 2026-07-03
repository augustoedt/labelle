import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { ProfessionalsApi, AppointmentsApi } from "@/server/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/ui/PageHeader";

export default function MinhasComissoes() {
  const { user } = useRouteContext({ from: "__root__" });

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });

  const myProfessional = professionals.find(p => p.user_id === user?.id);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
    enabled: !!myProfessional,
  });

  const today = new Date();
  const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");

  const myDone = appointments.filter(
    a => a.professional_id === myProfessional?.id && a.status === "concluido" && a.date >= monthStart
  );

  const totalRevenue = myDone.reduce((s, a) => s + (a.price || 0), 0);
  const commissionRate = myProfessional?.commission_percent || 0;
  const myCommission = totalRevenue * (commissionRate / 100);

  if (!myProfessional) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-muted-foreground text-sm">Perfil profissional não vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Minhas Comissões"
        subtitle={format(today, "MMMM yyyy", { locale: ptBR })}
      />

      <div className="px-5 space-y-3">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Atendimentos</p>
            <p className="text-2xl font-heading font-bold mt-1">{myDone.length}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-lg font-heading font-bold mt-1">R$ {totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-primary/10 rounded-2xl border border-primary/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">Comissão ({commissionRate}%)</p>
            <p className="text-lg font-heading font-bold text-primary mt-1">R$ {myCommission.toFixed(0)}</p>
          </div>
        </div>

        {/* Lista de atendimentos */}
        <p className="text-xs font-medium text-muted-foreground pt-2">Atendimentos do mês</p>
        {myDone.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum atendimento concluído este mês</p>
        ) : (
          myDone.map(apt => {
            const commission = (apt.price || 0) * (commissionRate / 100);
            return (
              <div key={apt.id} className="bg-card rounded-2xl border border-border/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{apt.client_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.service_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(apt.date + "T12:00"), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">R$ {(apt.price || 0).toFixed(0)}</p>
                    <p className="text-xs text-primary font-semibold">+ R$ {commission.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
