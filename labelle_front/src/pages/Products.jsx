import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductsApi } from "@/server/api";
import { Plus, ArrowLeft, AlertTriangle, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import { formatBRL } from "@/lib/format";

export default function Products() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", category: "", price: "", cost: "", quantity: "", min_quantity: "5", description: "",
  });
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => ProductsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => ProductsApi.create({
      data: {
        ...data, price: parseFloat(data.price) || 0, cost: parseFloat(data.cost) || 0,
        quantity: parseInt(data.quantity) || 0, min_quantity: parseInt(data.min_quantity) || 5,
      },
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ProductsApi.update({
      id,
      attributes: {
        ...data, price: parseFloat(data.price) || 0, cost: parseFloat(data.cost) || 0,
        quantity: parseInt(data.quantity) || 0, min_quantity: parseInt(data.min_quantity) || 5,
      },
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); setEditing(null); },
  });

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "", category: p.category || "", price: String(p.price || ""),
      cost: String(p.cost || ""), quantity: String(p.quantity || "0"),
      min_quantity: String(p.min_quantity || "5"), description: p.description || "",
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", category: "", price: "", cost: "", quantity: "", min_quantity: "5", description: "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const lowStockCount = products.filter(p => p.quantity <= (p.min_quantity || 5)).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Estoque"
        subtitle={`${products.length} produtos • ${lowStockCount} em baixa`}
        action={
          <div className="flex gap-2">
            <Link to="/mais"><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <Button size="sm" className="rounded-xl gap-1.5" onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
          </div>
        }
      />

      <div className="px-5 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : (
          <>
        {products.map((p) => {
          const isLow = p.quantity <= (p.min_quantity || 5);
          return (
            <div key={p.id} role="button" tabIndex={0} className="bg-card rounded-xl border border-border/50 p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openEdit(p)}>
              <div className={cn("p-2 rounded-lg", isLow ? "bg-red-50" : "bg-secondary/50")}>
                {isLow ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Package className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <div className="text-right">
                <p className="font-heading font-bold tracking-tight tabular-nums">{formatBRL(p.price)}</p>
                <p className={cn("text-xs", isLow ? "text-red-500 font-medium" : "text-muted-foreground")}>{p.quantity} un.</p>
              </div>
            </div>
          );
        })}
        {products.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum produto cadastrado</p>
        )}
          </>
        )}
      </div>

      <Sheet open={showForm} onOpenChange={() => { setShowForm(false); setEditing(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">{editing ? "Editar Produto" : "Novo Produto"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-8">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do produto" />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Ex: Coloração, Cuidados..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Preço Venda (R$)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Custo (R$)</Label>
                <Input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantidade</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Qtd. Mínima (Alerta)</Label>
                <Input type="number" value={form.min_quantity} onChange={e => setForm(p => ({ ...p, min_quantity: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full rounded-full h-12 font-semibold">
              {editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
