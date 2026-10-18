import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
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
  const location = useLocation();
  const navigate = useNavigate();
  const route = user?.role === "admin" ? "/admin/promocoes" : "/profissional/promocoes";
  const search = location.search;
  const updateSearch = (patch, replace = true) => navigate({ to: route, search: (previous) => ({ ...previous, ...patch }), replace });
  // Profissional vê as ofertas ativas em leitura; só o admin gerencia.
  const canEdit = user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", description: "", discount_type: "percent", discount_value: "",
    start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", rules: "", is_active: true,
  });
  const queryClient = useQueryClient();

  const { data: promotions = [], isLoading, isSuccess: promotionsReady } = useQuery({
    queryKey: ["promotions"],
    // note: no "created_date" field on our Promotion resource yet (no timestamps)
    queryFn: () => PromotionsApi.list(),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", discount_type: "percent", discount_value: "", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", rules: "", is_active: true });
    setShowForm(true);
  };
  const openEdit = (promotion) => {
    setEditing(promotion);
    setForm({
      name: promotion.name || "", description: promotion.description || "",
      discount_type: promotion.discount_type || "percent", discount_value: String(promotion.discount_value ?? ""),
      start_date: promotion.start_date || "", end_date: promotion.end_date || "",
      rules: promotion.rules || "", is_active: promotion.is_active !== false,
    });
    setShowForm(true);
  };

  useEffect(() => {
    if (!canEdit) return;
    if (search.view === "new") {
      if (!showForm || editing) openNew();
      return;
    }
    if (typeof search.promotion === "string") {
      if (isLoading || !promotionsReady) return;
      const promotion = promotions.find((item) => String(item.id) === search.promotion);
      if (!promotion) {
        updateSearch({ promotion: undefined, view: undefined });
        setShowForm(false);
        setEditing(null);
      } else if (String(editing?.id) !== search.promotion) openEdit(promotion);
      return;
    }
    setShowForm(false);
    setEditing(null);
  }, [canEdit, search.promotion, search.view, promotions, isLoading, promotionsReady]);

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? PromotionsApi.update({ id, attributes: { ...data, discount_value: parseFloat(data.discount_value) || 0 } })
      : PromotionsApi.create({ data: { ...data, discount_value: parseFloat(data.discount_value) || 0 } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["promotions"] }); setShowForm(false); setEditing(null); updateSearch({ promotion: undefined, view: undefined }); },
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
            <Link to={canEdit ? "/admin/mais" : "/profissional/mais"}><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
            {canEdit && (
              <Button size="sm" className="rounded-xl gap-1.5" onClick={() => updateSearch({ view: "new", promotion: undefined }, false)}><Plus className="w-4 h-4" /> Nova</Button>
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
          <div key={promo.id} role={canEdit ? "button" : undefined} tabIndex={canEdit ? 0 : undefined} onClick={() => { if (canEdit) updateSearch({ promotion: String(promo.id), view: "edit" }, false); }} className="bg-card rounded-2xl border border-border/50 p-4">
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
              <Switch checked={promo.is_active} disabled={!canEdit} onClick={(event) => event.stopPropagation()} onCheckedChange={(v) => toggleMutation.mutate({ id: promo.id, is_active: v })} />
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
        <Sheet open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); updateSearch({ promotion: undefined, view: undefined }); } }}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">{editing ? "Editar Promoção" : "Nova Promoção"}</SheetTitle>
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
            {saveMutation.isError && <p role="alert" className="text-sm text-destructive">Não foi possível salvar. Tente novamente.</p>}
            <Button onClick={() => saveMutation.mutate({ id: editing?.id, data: form })} disabled={saveMutation.isPending} className="w-full rounded-full h-12 font-semibold">
              {saveMutation.isPending ? "Salvando..." : editing ? "Atualizar Promoção" : "Criar Promoção"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      )}
    </div>
  );
}
