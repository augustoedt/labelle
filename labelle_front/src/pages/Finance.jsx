import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TransactionsApi } from "@/server/api";
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
  const [showForm, setShowForm] = useState(false);
  const [period, setPeriod] = useState("mes");
  const [statusFilter, setStatusFilter] = useState("pago");
  const [form, setForm] = useState({
    type: "entrada", category: "servico", description: "", amount: "",
    date: format(new Date(), "yyyy-MM-dd"), payment_method: "pix",
  });
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => TransactionsApi.list({ sort: "-date", limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => TransactionsApi.create({ data: { ...data, amount: parseFloat(data.amount), status: "pago" } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); setShowForm(false); resetForm(); },
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

  // Apenas lançamentos "pago" entram nos totais
  const paidInRange = transactions.filter(t => t.date >= start && t.date <= end && t.status === "pago");
  const entradas = paidInRange.filter(t => t.type === "entrada").reduce((s, t) => s + (t.amount || 0), 0);
  const saidas = paidInRange.filter(t => t.type === "saida").reduce((s, t) => s + (t.amount || 0), 0);
  const lucro = entradas - saidas;

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
          <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Lançar
          </Button>
        }
      />

      {/* Period tabs */}
      <div className="px-5">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="w-full bg-secondary/50 rounded-xl">
            <TabsTrigger value="dia" className="flex-1 rounded-lg text-xs">Dia</TabsTrigger>
            <TabsTrigger value="semana" className="flex-1 rounded-lg text-xs">Semana</TabsTrigger>
            <TabsTrigger value="mes" className="flex-1 rounded-lg text-xs">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats — apenas lançamentos pagos */}
      <div className="px-5 grid grid-cols-3 gap-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard title="Entradas" value={formatBRL(entradas)} icon={ArrowUpRight} />
            <StatCard title="Saídas" value={formatBRL(saidas)} icon={ArrowDownRight} />
            <StatCard title="Lucro" value={formatBRL(lucro)} icon={DollarSign} />
          </>
        )}
      </div>

      {/* Pendentes de confirmação */}
      <PendingTransactions transactions={transactions} isLoading={isLoading} />

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
              onClick={() => setStatusFilter(v)}
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
                {t.description || t.category}
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
      <Sheet open={showForm} onOpenChange={() => { setShowForm(false); resetForm(); }}>
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
            <Button onClick={() => createMutation.mutate(form)} className="w-full rounded-xl h-12 font-semibold">
              Salvar Lançamento
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
