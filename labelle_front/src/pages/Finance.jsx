import {financialTotals} from "@/lib/financialTotals";
import {needsEditComment,MissingEditComment} from "@/components/finance/FinancialEditHistory";
import CommissionPanel from "@/components/finance/CommissionPanel";
import { useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TransactionsApi,PaymentsApi,AppointmentsApi,AppointmentServicesApi,listFinancialEdits } from "@/server/api";
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import PendingTransactions from "@/components/finance/PendingTransactions";
import { formatBRL } from "@/lib/format";

export default function Finance() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = location.search;
  const validPeriods = ["dia", "semana", "mes"];
  const validStatuses = ["pago", "pagamento_parcial", "pendente_confirmacao", "cancelado", "estornado"];
  const period = validPeriods.includes(search.period) ? search.period : "mes";
  const statusFilter = validStatuses.includes(search.status) ? search.status : "pago";
  const updateSearch = (patch, replace = true) => navigate({ to: "/admin/financeiro", search: (previous) => ({ ...previous, ...patch }), replace });
  const showForm = search.view === "new";
  const [form, setForm] = useState({
    type: "entrada", category: "servico", description: "", amount: "",
    date: format(new Date(), "yyyy-MM-dd"), payment_method: "pix",
  });
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => TransactionsApi.list({ sort: "-date", limit: 10000 }),
  });

  const paymentsQuery=useQuery({queryKey:["payments"],queryFn:()=>PaymentsApi.list({limit:10000})});
  const payments=paymentsQuery.data || [];
  const commissionAppointments=useQuery({queryKey:["commission-appointments"],queryFn:()=>AppointmentsApi.list({limit:10000,sort:"-date"})});
  const commissionItems=useQuery({queryKey:["commission-items"],queryFn:()=>AppointmentServicesApi.list({limit:10000})});
  const edits=useQuery({queryKey:["financial-edits"],queryFn:()=>listFinancialEdits({data:{limit:10000,sort:"-inserted_at"}})});
  const noComment=id=>!!id && (edits.data || []).some(e=>e.appointment_id===id && needsEditComment(e));
  const createMutation = useMutation({
    mutationFn: (data) => TransactionsApi.create({ data: { ...data, amount: parseFloat(data.amount), status: "pago" } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); updateSearch({ view: undefined }); resetForm(); },
  });

  const resetForm = () => setForm({
    type: "entrada", category: "servico", description: "", amount: "",
    date: format(new Date(), "yyyy-MM-dd"), payment_method: "pix",
  });

  const today = new Date();
  const getRange = () => {
    if (period === "dia") return { start: format(today, "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
    if (period === "semana") return { start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    return { start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(endOfMonth(today), "yyyy-MM-dd") };
  };

  const { start, end } = getRange();

  const totals=financialTotals(transactions,commissionAppointments.data || [],commissionItems.data || [],start,end,payments);
  const totalsLoading=isLoading || paymentsQuery.isPending || commissionAppointments.isPending || commissionItems.isPending;
  const totalsError=paymentsQuery.isError || commissionAppointments.isError || commissionItems.isError;

  // Lista filtrada por período + status selecionado
  const filtered = transactions
    .filter(t => t.date >= start && t.date <= end)
    .filter(t => {
      const s = t.status || "pago";
      return s === statusFilter;
    })
    .sort((a, b) => b.date?.localeCompare(a.date));

  const methodLabels = {
    pix: "Pix", dinheiro: "Dinheiro", debito: "Débito", credito: "Crédito",
    transferencia: "Transf.", a_definir: "A definir",
  };

  const statusLabel = { pago: "Pago", pendente_confirmacao: "Pendente", pagamento_parcial: "Parcial", cancelado: "Cancelado", estornado: "Estornado" };
  const statusBadgeClass = {
    pago: "text-emerald-600",
    pendente_confirmacao: "text-amber-600",
    pagamento_parcial: "text-orange-600",
    cancelado: "text-muted-foreground",
    estornado: "text-destructive",
  };

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Financeiro"
        action={
          <Button size="sm" className="rounded-xl gap-1.5" onClick={() => updateSearch({ view: "new" }, false)}>
            <Plus className="w-4 h-4" /> Lançar
          </Button>
        }
      />

      {/* Period tabs */}
      <div className="px-5">
        <Tabs value={period} onValueChange={(value) => updateSearch({ period: value }, false)}>
          <TabsList className="w-full bg-secondary/50 rounded-xl">
            <TabsTrigger value="dia" className="flex-1 rounded-lg text-xs">Dia</TabsTrigger>
            <TabsTrigger value="semana" className="flex-1 rounded-lg text-xs">Semana</TabsTrigger>
            <TabsTrigger value="mes" className="flex-1 rounded-lg text-xs">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats — apenas lançamentos pagos */}
      <div className="px-5 grid grid-cols-2 xl:grid-cols-5 gap-2">
        {totalsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard title="Entradas" value={formatBRL(totals.income,{decimals:2})} icon={ArrowUpRight} />
            <StatCard title="Saídas" value={formatBRL(totals.expenses,{decimals:2})} icon={ArrowDownRight} />
            <StatCard title="Saldo em caixa" value={formatBRL(totals.cash,{decimals:2})} icon={DollarSign} />
            <StatCard title="Comissões dos recebidos" value={totalsError ? "Indisponível" : formatBRL(totals.commission,{decimals:2})} icon={DollarSign} />
            <StatCard title="Saldo após comissões" value={totalsError ? "Indisponível" : formatBRL(totals.afterCommission,{decimals:2})} icon={DollarSign} />
          </>
        )}
      </div>

      <p className="px-5 text-xs text-muted-foreground">Saldo após comissões considera os atendimentos concluídos recebidos no período, incluindo bônus e gorjetas. Pagamentos parciais entram pela data do recebimento; a comissão dos recebidos é proporcional. Repasses já lançados em Saídas → Comissão não são descontados duas vezes.</p>
      {(totals.missing || totalsError) && <p role="alert" className="px-5 text-sm text-amber-700">{totalsError?"Não foi possível carregar as comissões.":"Existem comissões sem percentual definido: o saldo após comissões é parcial."}</p>}
      {/* Pendentes de confirmação */}
      {paymentsQuery.isError ? <p role="alert" className="px-5 text-red-700">Não foi possível carregar os recebimentos. <button onClick={()=>paymentsQuery.refetch()}>Tentar novamente</button></p> : <PendingTransactions transactions={transactions} payments={payments} isLoading={isLoading || paymentsQuery.isPending} />}

      {/* Status filter */}
      <div className="px-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: "pago", l: "Pagos" },
            { v: "pagamento_parcial", l: "Parcial" },
            { v: "pendente_confirmacao", l: "Pendentes" },
            { v: "cancelado", l: "Cancelados" },
            { v: "estornado", l: "Estornados" },
          ].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => { if (v !== statusFilter) updateSearch({ status: v }, false); }}
              className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                statusFilter === v
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border/50 text-muted-foreground"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <CommissionPanel start={start} end={end}/>
      {/* Transaction list */}
      <div className="px-5 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Movimentações</h3>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : (
          <>
        {filtered.map((t) => (
          <div key={t.id} className={cn(
            "bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3",
            t.status === "pendente_confirmacao" && "border-amber-200 bg-amber-50/50",
            t.status === "cancelado" && "opacity-60",
            noComment(t.appointment_id) && "financial-edit-uncommented",
          )}>
            <div className={cn(
              "p-2 rounded-lg",
              t.type === "entrada" ? "bg-emerald-50" : "bg-red-50"
            )}>
              {t.type === "entrada" ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium truncate", t.status === "cancelado" && "line-through")}>
                {noComment(t.appointment_id) && <MissingEditComment/>}{t.description || t.category}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.date && format(new Date(t.date + "T12:00"), "dd/MM")} • {methodLabels[t.payment_method] || t.payment_method}
                {" • "}<span className={cn("font-medium", statusBadgeClass[t.status || "pago"])}>{statusLabel[t.status || "pago"]}</span>
              </p>
            </div>
            <p className={cn("font-semibold text-sm tabular-nums", t.type === "entrada" ? "text-emerald-600" : "text-red-600")}>
              {t.type === "saida" ? "-" : "+"}{formatBRL(t.amount, { decimals: 2 })}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Sem movimentações neste período</p>
        )}
          </>
        )}
      </div>

      {/* New transaction form */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) { updateSearch({ view: undefined }); resetForm(); } }}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">Novo Lançamento</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-8">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                  <SelectItem value="comissao">Comissão</SelectItem>
                  <SelectItem value="despesa_fixa">Despesa Fixa</SelectItem>
                  <SelectItem value="despesa_variavel">Despesa Variável</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição do lançamento" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMutation.mutate(form)} className="w-full rounded-full h-12 font-semibold">
              Salvar Lançamento
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
