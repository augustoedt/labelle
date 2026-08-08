import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServicesApi } from "@/server/api";
import { Plus, ArrowLeft, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";

const categoryLabels = {
  cabelo: "Cabelo", unha: "Unha", estetica: "Estética", sobrancelha: "Sobrancelha", maquiagem: "Maquiagem", outros: "Outros"
};

export default function Services() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", category: "cabelo", price: "", duration_minutes: "", commission_percent: "", recurrence_days: "", description: "",
  });
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => ServicesApi.create({
      data: {
        ...data, price: parseFloat(data.price) || 0, duration_minutes: parseInt(data.duration_minutes) || 60,
        commission_percent: parseFloat(data.commission_percent) || 0, recurrence_days: parseInt(data.recurrence_days) || 0,
      },
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ServicesApi.update({
      id,
      attributes: {
        ...data, price: parseFloat(data.price) || 0, duration_minutes: parseInt(data.duration_minutes) || 60,
        commission_percent: parseFloat(data.commission_percent) || 0, recurrence_days: parseInt(data.recurrence_days) || 0,
      },
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["services"] }); setShowForm(false); setEditing(null); },
  });

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({
      name: svc.name || "", category: svc.category || "cabelo", price: String(svc.price || ""),
      duration_minutes: String(svc.duration_minutes || ""), commission_percent: String(svc.commission_percent || ""),
      recurrence_days: String(svc.recurrence_days || ""), description: svc.description || "",
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", category: "cabelo", price: "", duration_minutes: "", commission_percent: "", recurrence_days: "", description: "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editing) { updateMutation.mutate({ id: editing.id, data: form }); }
    else { createMutation.mutate(form); }
  };

  const grouped = services.reduce((acc, s) => {
    const cat = s.category || "outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <PageHeader
        title="Serviços"
        subtitle={`${services.length} cadastrados`}
        action={
          <div className="flex gap-2">
            <Link to="/mais">
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <Button size="sm" className="rounded-xl gap-1.5" onClick={openNew}>
              <Plus className="w-4 h-4" /> Novo
            </Button>
          </div>
        }
      />

      <div className="px-5 space-y-5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
        Object.entries(grouped).map(([cat, svcs]) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {categoryLabels[cat] || cat}
            </h3>
            <div className="space-y-2">
              {svcs.map((svc) => (
                <div key={svc.id} role="button" tabIndex={0} className="bg-card rounded-xl border border-border/50 shadow-sm p-3.5 cursor-pointer transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openEdit(svc)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{svc.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration_minutes}min</span>
                        {svc.commission_percent > 0 && <span>{svc.commission_percent}% comissão</span>}
                      </div>
                    </div>
                    <p className="font-heading font-bold text-lg">R${svc.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
        )}
      </div>

      <Sheet open={showForm} onOpenChange={() => { setShowForm(false); setEditing(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">{editing ? "Editar Serviço" : "Novo Serviço"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-8">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Corte Feminino" />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Preço (R$)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Duração (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="60" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Comissão (%)</Label>
                <Input type="number" value={form.commission_percent} onChange={e => setForm(p => ({ ...p, commission_percent: e.target.value }))} placeholder="40" />
              </div>
              <div>
                <Label className="text-xs">Retorno (dias)</Label>
                <Input type="number" value={form.recurrence_days} onChange={e => setForm(p => ({ ...p, recurrence_days: e.target.value }))} placeholder="30" />
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full rounded-xl h-12 font-semibold">
              {editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
