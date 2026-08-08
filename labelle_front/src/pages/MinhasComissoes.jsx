import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { ProfessionalsApi, AppointmentsApi, AppointmentServicesApi, ServicesApi } from "@/server/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

export default function MinhasComissoes() {
  const { user } = useRouteContext({ from: "__root__" });

  const { data: professionals = [], isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });

  const myProfessional = professionals.find(p => p.user_id === user?.id);

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
    enabled: !!myProfessional,
  });

  // Comissão é calculada em cima do commission_percent cadastrado no Serviço
  // (varia por categoria: química 30% / sem química 40% / manicure e
  // pedicure 50%), não num percentual fixo do profissional.
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
    enabled: !!myProfessional,
  });
  const commissionRateByServiceId = Object.fromEntries(
    services.map(s => [s.id, s.commission_percent || 0])
  );

  // Serviços adicionais lançados durante o atendimento (a policy do backend
  // já limita a lista aos atendimentos do próprio profissional).
  const { data: extraItems = [] } = useQuery({
    queryKey: ["appointment-services"],
    queryFn: () => AppointmentServicesApi.list({ limit: 500 }),
    enabled: !!myProfessional,
  });
  const itemsByAppointment = extraItems.reduce((acc, item) => {
    (acc[item.appointment_id] ||= []).push(item);
    return acc;
  }, {});

  const today = new Date();
  const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");

  const myDone = appointments.filter(
    a => a.professional_id === myProfessional?.id && a.status === "concluido" && a.date >= monthStart
  );

  const revenueFor = apt =>
    (apt.price || 0) + (itemsByAppointment[apt.id] || []).reduce((s, i) => s + (i.price || 0), 0);

  const commissionFor = apt =>
    (apt.price || 0) * ((commissionRateByServiceId[apt.service_id] || 0) / 100) +
    (itemsByAppointment[apt.id] || []).reduce(
      (s, i) => s + (i.price || 0) * ((commissionRateByServiceId[i.service_id] || 0) / 100),
      0
    );

  const totalRevenue = myDone.reduce((s, a) => s + revenueFor(a), 0);
  const myCommission = myDone.reduce((s, a) => s + commissionFor(a), 0);

  if (isLoadingProfessionals) {
    return (
      <div className="space-y-4 px-5 pt-6">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

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
        {isLoadingAppointments ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </>
        ) : (
          <>
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
            <p className="text-xs text-muted-foreground">Comissão</p>
            <p className="text-lg font-heading font-bold text-primary mt-1">R$ {myCommission.toFixed(0)}</p>
          </div>
        </div>

        {/* Lista de atendimentos */}
        <p className="text-xs font-medium text-muted-foreground pt-2">Atendimentos do mês</p>
        {myDone.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum atendimento concluído este mês</p>
        ) : (
          myDone.map(apt => {
            const commission = commissionFor(apt);
            const extras = itemsByAppointment[apt.id] || [];
            const serviceNames = [apt.service_name, ...extras.map(i => i.service_name)].filter(Boolean).join(" + ");
            return (
              <div key={apt.id} className="bg-card rounded-2xl border border-border/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{apt.client_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{serviceNames}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(apt.date + "T12:00"), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">R$ {revenueFor(apt).toFixed(0)}</p>
                    <p className="text-xs text-primary font-semibold">+ R$ {commission.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
          </>
        )}
      </div>
    </div>
  );
}
