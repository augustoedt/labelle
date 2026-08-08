import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PromotionsApi } from "@/server/api";
import { Plus, ArrowLeft, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import PageHeader from "@/components/ui/PageHeader";
import { formatBRL } from "@/lib/format";
import { useUser } from "@/lib/auth";

export default function Promotions() {
  const user = useUser();
  // Profissional vê as ofertas ativas em leitura; só o admin gerencia.
  const canEdit = user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", discount_type: "percent", discount_value: "",
    start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", rules: "", is_active: true,
  });
  const queryClient = useQueryClient();

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["promotions"],
    // note: no "created_date" field on our Promotion resource yet (no timestamps)
    queryFn: () => PromotionsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => PromotionsApi.create({ data: { ...data, discount_value: parseFloat(data.discount_value) || 0 } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["promotions"] }); setShowForm(false); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => PromotionsApi.update({ id, attributes: { is_active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotions"] }),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Promoções"
        subtitle={`${promotions.filter(p => p.is_active).length} ativas`}
        action={
          <div className="flex gap-2">
            <Link to="/mais"><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
            {canEdit && (
              <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Nova</Button>
            )}
          </div>
        }
      />

      <div className="px-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))
        ) : (
          <>
        {promotions.map((promo) => (
          <div key={promo.id} className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/20">
                  <Tag className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{promo.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {promo.discount_type === "percent" ? `${promo.discount_value}% OFF` : `${formatBRL(promo.discount_value)} OFF`}
                  </p>
                </div>
              </div>
              <Switch checked={promo.is_active} disabled={!canEdit} onCheckedChange={(v) => toggleMutation.mutate({ id: promo.id, is_active: v })} />
            </div>
            {promo.description && <p className="text-xs text-muted-foreground mt-2">{promo.description}</p>}
            {promo.end_date && (
              <p className="text-xs text-muted-foreground mt-2">Válido até {format(new Date(promo.end_date + "T12:00"), "dd/MM/yyyy")}</p>
            )}
          </div>
        ))}
        {promotions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhuma promoção criada</p>
        )}
          </>
        )}
      </div>

      {canEdit && (
        <Sheet open={showForm} onOpenChange={() => setShowForm(false)}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">Nova Promoção</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-8">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Black Friday" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo Desconto</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="value">Valor (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor Desconto</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Fim</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <Button onClick={() => createMutation.mutate(form)} className="w-full rounded-xl h-12 font-semibold">
              Criar Promoção
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      )}
    </div>
  );
}
