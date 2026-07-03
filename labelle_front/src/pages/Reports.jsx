import { useQuery } from "@tanstack/react-query";
import { AppointmentsApi, TransactionsApi, ProfessionalsApi } from "@/server/api";
import { ArrowLeft, TrendingUp, Users, Scissors, DollarSign, FileDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import * as XLSX from "xlsx";

export default function Reports() {
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => TransactionsApi.list({ sort: "-date", limit: 500 }),
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });

  // Last 7 days revenue chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayRevenue = transactions
      .filter(t => t.date === dateStr && t.type === "entrada")
      .reduce((s, t) => s + (t.amount || 0), 0);
    return { day: format(date, "EEE", { locale: ptBR }), value: dayRevenue };
  });

  // Top services
  const serviceCounts = {};
  appointments.filter(a => a.status === "concluido").forEach(a => {
    serviceCounts[a.service_name] = (serviceCounts[a.service_name] || 0) + 1;
  });
  const topServices = Object.entries(serviceCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  // Professional performance
  const profPerformance = professionals.map(p => {
    const completed = appointments.filter(a => a.professional_id === p.id && a.status === "concluido");
    const revenue = completed.reduce((s, a) => s + (a.price || 0), 0);
    return { name: p.name, count: completed.length, revenue };
  }).sort((a, b) => b.revenue - a.revenue);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: Agendamentos
    const apptData = appointments.map(a => ({
      "Data": a.date,
      "Horário": a.time,
      "Cliente": a.client_name,
      "Telefone": a.client_phone,
      "Serviço": a.service_name,
      "Profissional": a.professional_name,
      "Valor (R$)": a.price || 0,
      "Status": a.status,
      "Pagamento": a.payment_method || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(apptData), "Agendamentos");

    // Aba 2: Transações
    const txData = transactions.map(t => ({
      "Data": t.date,
      "Tipo": t.type,
      "Categoria": t.category || "",
      "Descrição": t.description || "",
      "Valor (R$)": t.amount || 0,
      "Pagamento": t.payment_method || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), "Transações");

    // Aba 3: Ranking Profissionais
    const profData = profPerformance.map((p, i) => ({
      "Posição": i + 1,
      "Profissional": p.name,
      "Atendimentos": p.count,
      "Faturamento (R$)": p.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profData), "Profissionais");

    // Aba 4: Top Serviços
    const svcData = topServices.map(([name, count], i) => ({
      "Posição": i + 1,
      "Serviço": name,
      "Qtd Realizados": count,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(svcData), "Serviços");

    XLSX.writeFile(wb, `relatorio-la-belle-${format(new Date(), "yyyy-MM")}.xlsx`);
  };

  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const monthEntradas = transactions.filter(t => t.date >= monthStart && t.type === "entrada").reduce((s, t) => s + (t.amount || 0), 0);
  const monthSaidas = transactions.filter(t => t.date >= monthStart && t.type === "saida").reduce((s, t) => s + (t.amount || 0), 0);
  const monthCompleted = appointments.filter(a => a.date >= monthStart && a.status === "concluido");
  const ticketMedio = monthCompleted.length > 0 ? monthEntradas / monthCompleted.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        action={
          <div className="flex items-center gap-2">
            <Button onClick={exportToExcel} size="sm" variant="outline" className="gap-1.5 text-xs h-8 rounded-xl">
              <FileDown className="w-3.5 h-3.5" />
              Exportar Excel
            </Button>
            <Link to="/mais"><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
          </div>
        }
      />

      {/* Monthly summary */}
      <div className="px-5 grid grid-cols-2 gap-3">
        <StatCard title="Faturamento" value={`R$${monthEntradas.toFixed(0)}`} icon={TrendingUp} />
        <StatCard title="Lucro Estimado" value={`R$${(monthEntradas - monthSaidas).toFixed(0)}`} icon={DollarSign} />
        <StatCard title="Atendimentos" value={monthCompleted.length} icon={Scissors} />
        <StatCard title="Ticket Médio" value={`R$${ticketMedio.toFixed(0)}`} icon={Users} />
      </div>

      {/* Revenue chart */}
      <div className="px-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Últimos 7 dias</h3>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip formatter={(v) => `R$${v}`} />
              <Bar dataKey="value" fill="hsl(350, 45%, 55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top services */}
      <div className="px-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Serviços Mais Vendidos</h3>
        <div className="space-y-2">
          {topServices.map(([name, count], i) => (
            <div key={name} className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="flex-1 text-sm font-medium">{name}</span>
              <span className="text-sm text-muted-foreground">{count}x</span>
            </div>
          ))}
          {topServices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
        </div>
      </div>

      {/* Professional ranking */}
      <div className="px-5 pb-8">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ranking Profissionais</h3>
        <div className="space-y-2">
          {profPerformance.map((p, i) => (
            <div key={p.name} className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.count} atendimentos</p>
              </div>
              <p className="font-heading font-bold text-sm">R${p.revenue.toFixed(0)}</p>
            </div>
          ))}
          {profPerformance.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
        </div>
      </div>
    </div>
  );
}
