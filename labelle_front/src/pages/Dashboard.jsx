import { useQuery } from "@tanstack/react-query";
import { AppointmentsApi, TransactionsApi, ProductsApi } from "@/server/api";
import { DollarSign, Users, Scissors, TrendingUp } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import TodayAgenda from "@/components/dashboard/TodayAgenda";
import AlertsSection from "@/components/dashboard/AlertsSection";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 200 }),
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => TransactionsApi.list({ sort: "-date", limit: 200 }),
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => ProductsApi.list(),
  });

  const isLoading = isLoadingAppointments || isLoadingTransactions || isLoadingProducts;

  const todayAppts = appointments.filter(a => a.date === today && a.status !== "cancelado");
  const monthAppts = appointments.filter(a => a.date >= monthStart && a.status === "concluido");

  const todayRevenue = transactions
    .filter(t => t.date === today && t.type === "entrada")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const monthRevenue = transactions
    .filter(t => t.date >= monthStart && t.type === "entrada")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const ticketMedio = monthAppts.length > 0
    ? (monthRevenue / monthAppts.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-5 pt-10 pb-5 flex items-center justify-between" style={{background: "linear-gradient(135deg, #F28FA3 0%, #F7A6B8 100%)"}}>
        <span className="font-heading text-2xl text-white font-semibold">La Belle Studio</span>
        <p className="text-xs text-white/90">
          {format(new Date(), "EEEE, d/MM", { locale: ptBR })}
        </p>
      </div>

      {/* Stats */}
      <div className="px-5 grid grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              title="Hoje"
              value={`R$ ${todayRevenue.toFixed(0)}`}
              icon={DollarSign}
            />
            <StatCard
              title="Este Mês"
              value={`R$ ${monthRevenue.toFixed(0)}`}
              icon={TrendingUp}
            />
            <StatCard
              title="Atendimentos"
              value={todayAppts.length}
              icon={Scissors}
              trend={`${monthAppts.length} este mês`}
            />
            <StatCard
              title="Ticket Médio"
              value={`R$ ${ticketMedio.toFixed(0)}`}
              icon={Users}
            />
          </>
        )}
      </div>

      {/* Alerts */}
      <AlertsSection appointments={appointments} products={products} isLoading={isLoading} />

      {/* Today's Agenda */}
      <div>
        <div className="px-5 flex items-center justify-between mb-3">
          <h2 className="text-base font-heading font-semibold">Agenda de Hoje</h2>
          <span className="text-xs text-primary font-medium">{todayAppts.length} agendamento(s)</span>
        </div>
        <TodayAgenda appointments={todayAppts.sort((a, b) => a.time?.localeCompare(b.time))} isLoading={isLoadingAppointments} />
      </div>
    </div>
  );
}
