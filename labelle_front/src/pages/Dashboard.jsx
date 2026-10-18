import CommissionPanel from "@/components/finance/CommissionPanel";
import PhonePendingPanel from "@/components/clients/PhonePendingPanel";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AppointmentsApi, TransactionsApi, ProductsApi } from "@/server/api";
import { DollarSign, Users, CalendarDays, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import TodayAgenda from "@/components/dashboard/TodayAgenda";
import AlertsSection from "@/components/dashboard/AlertsSection";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/format";

export default function Dashboard() {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const monthStart = format(
    new Date(now.getFullYear(), now.getMonth(), 1),
    "yyyy-MM-dd",
  );
  const appointmentQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
  });
  const transactionQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: () => TransactionsApi.list({ sort: "-date", limit: 200 }),
  });
  const productQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => ProductsApi.list(),
  });
  const appointments = appointmentQuery.data || [];
  const transactions = transactionQuery.data || [];
  const products = productQuery.data || [];
  const loading =
    appointmentQuery.isPending ||
    transactionQuery.isPending ||
    productQuery.isPending;
  const failed =
    appointmentQuery.isError ||
    transactionQuery.isError ||
    productQuery.isError;
  const todayAppointments = appointments.filter(
    (a) => a.date === today && a.status !== "cancelado",
  );
  const completed = appointments.filter(
    (a) => a.date === today && a.status === "concluido",
  );
  const paid = transactions.filter(
    (t) => t.type === "entrada" && t.status === "pago",
  );
  const todayRevenue = paid
    .filter((t) => t.date === today)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthRevenue = paid
    .filter((t) => t.date >= monthStart && t.date <= today)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(now, 6 - i);
    const date = format(day, "yyyy-MM-dd");
    return {
      day: format(day, "EEE", { locale: ptBR }),
      value: paid
        .filter((t) => t.date === date)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    };
  });
  const counts = appointments
    .filter(
      (a) =>
        a.status === "concluido" && a.date >= monthStart && a.date <= today,
    )
    .reduce((acc, a) => {
      const name = a.service_name || "Serviço";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
  const topServices = Object.entries(counts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5);
  return (
    <div className="space-y-7">
      <div className="dashboard-heading">
        <div>
          <h1>Olá, Admin!</h1>
          <p>Aqui está um resumo do seu salão hoje.</p>
        </div>
        <div className="dashboard-date">
          <CalendarDays size={16} />
          {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </div>
      </div>
      {failed && (
        <p role="alert" className="mx-5 rounded-xl border p-4 text-sm">
          Alguns dados não puderam ser carregados.{" "}
          <button
            className="text-action"
            onClick={() => {
              appointmentQuery.refetch();
              transactionQuery.refetch();
              productQuery.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      <div className="dashboard-stats">
        {loading ? (
          [1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              title="Agendamentos hoje"
              value={todayAppointments.length}
              icon={CalendarDays}
            />
            <StatCard
              title="Atendimentos concluídos"
              value={completed.length}
              icon={Users}
            />
            <StatCard
              title="Recebido hoje"
              value={formatBRL(todayRevenue)}
              icon={DollarSign}
            />
            <StatCard
              title="Recebido no mês"
              value={formatBRL(monthRevenue)}
              icon={TrendingUp}
            />
            <PhonePendingPanel compact />
          </>
        )}
      </div>
      <AlertsSection
        appointments={appointments}
        products={products}
        isLoading={loading}
      />
      <div className="dashboard-panels">
        <section className="dashboard-panel dashboard-agenda-panel">
          <div className="dashboard-panel-title">
<h2>Agenda do dia</h2>
            <Link to="/admin/agenda">Ver agenda →</Link>
          </div>
          <TodayAgenda
            appointments={appointments}
            isLoading={appointmentQuery.isPending}
          />
        </section>
        <div className="dashboard-side">
          <section className="dashboard-panel">
            <div className="dashboard-panel-title">
              <h2>Recebimentos da semana</h2>
              <Link to="/admin/financeiro">Ver financeiro</Link>
            </div>
            <div className="dashboard-chart">
              {transactionQuery.isPending ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={days}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#ede5df"
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9c8879", fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9c8879", fontSize: 10 }}
                      width={45}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8f0eb" }}
                      formatter={(value) => [
                        formatBRL(Number(value)),
                        "Recebido",
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      fill="#bc8881"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Pagamentos registrados como pagos nos dados carregados.
            </p>
          </section>
          <section className="dashboard-panel">
            <div className="dashboard-panel-title">
              <h2>Serviços mais realizados no mês</h2>
              <Link to="/admin/relatorios">Ver relatórios</Link>
            </div>
            {topServices.length ? (
              <ol className="dashboard-service-list">
                {topServices.map(([name, count], index) => (
                  <li key={name}>
                    <span>{index + 1}</span>
                    <span>{name}</span>
                    <small>{count}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground py-4">
                Nenhum atendimento concluído neste mês.
              </p>
            )}
          </section>
        </div>
      </div>
      <CommissionPanel />
      <PhonePendingPanel />
    </div>
  );
}
