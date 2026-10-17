import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServicesApi, ServiceVariantsApi } from "@/server/api";
import { Plus, ArrowLeft, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import { useUser } from "@/lib/auth";
import { formatBRL } from "@/lib/format";

const categoryLabels = {
  cabelo: "Cabelo",
  unha: "Unha",
  estetica: "Estética",
  sobrancelha: "Sobrancelha",
  maquiagem: "Maquiagem",
  outros: "Outros",
};

export default function Services() {
  const user = useUser();
  // Profissional vê o catálogo em leitura; só o admin edita.
  const canEdit = user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "cabelo",
    price: "",
    duration_minutes: "",
    commission_percent: "",
    recurrence_days: "",
    description: "",
  });
  const [variantsForm, setVariantsForm] = useState([]);
  const variantsQuery = useQuery({
    queryKey: ["service-variants"],
    queryFn: () => ServiceVariantsApi.list({ limit: 1000 }),
  });
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      ServicesApi.create({
        data: {
          ...data,
          variants: variantsForm.map((v) => ({
            ...v,
            price: Number(v.price),
            duration_minutes: Number(v.duration_minutes),
            commission_percent: Number(v.commission_percent),
          })),
          price: parseFloat(data.price) || 0,
          duration_minutes: parseInt(data.duration_minutes) || 60,
          commission_percent: parseFloat(data.commission_percent) || 0,
          recurrence_days: parseInt(data.recurrence_days) || 0,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["service-variants"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) =>
      ServicesApi.update({
        id,
        attributes: {
          ...data,
          variants: variantsForm.map((v) => ({
            ...v,
            price: Number(v.price),
            duration_minutes: Number(v.duration_minutes),
            commission_percent: Number(v.commission_percent),
          })),
          price: parseFloat(data.price) || 0,
          duration_minutes: parseInt(data.duration_minutes) || 60,
          commission_percent: parseFloat(data.commission_percent) || 0,
          recurrence_days: parseInt(data.recurrence_days) || 0,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["service-variants"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const openEdit = (svc) => {
    if (!variantsQuery.isSuccess) return;
    setVariantsForm(
      (variantsQuery.data || [])
        .filter((v) => v.service_id === svc.id)
        .map(
          ({
            id,
            name,
            description,
            price,
            duration_minutes,
            commission_percent,
            is_active,
          }) => ({
            id,
            name,
            description: description || "",
            price,
            duration_minutes,
            commission_percent: commission_percent || 0,
            is_active,
          }),
        ),
    );
    setEditing(svc);
    setForm({
      name: svc.name || "",
      category: svc.category || "cabelo",
      price: String(svc.price || ""),
      duration_minutes: String(svc.duration_minutes || ""),
      commission_percent: String(svc.commission_percent || ""),
      recurrence_days: String(svc.recurrence_days || ""),
      description: svc.description || "",
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setVariantsForm([]);
    setForm({
      name: "",
      category: "cabelo",
      price: "",
      duration_minutes: "",
      commission_percent: "",
      recurrence_days: "",
      description: "",
    });
    setShowForm(true);
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const valid =
    form.name.trim() &&
    Number(form.price) >= 0 &&
    Number(form.duration_minutes) > 0 &&
    Number(form.commission_percent || 0) >= 0 &&
    Number(form.commission_percent || 0) <= 100 &&
    variantsForm.every(
      (v) =>
        v.name.trim() &&
        v.price !== "" &&
        Number(v.price) >= 0 &&
        Number(v.duration_minutes) > 0 &&
        Number(v.commission_percent) >= 0 &&
        Number(v.commission_percent) <= 100,
    ) &&
    new Set(variantsForm.map((v) => v.name.trim().toLowerCase())).size ===
      variantsForm.length;
  const addVariants = () =>
    setVariantsForm((previous) => [
      ...previous,
      ...["P", "M", "G"]
        .filter((name) => !previous.some((v) => v.name === name))
        .map((name) => ({
          name,
          description:
            name === "G"
              ? "Cabelos longos e/ou volumosos"
              : name === "M"
                ? "Cabelos médios"
                : "Cabelos curtos",
          price:
            name === "G" && form.name.trim().toLowerCase() === "escova"
              ? 60
              : "",
          duration_minutes:
            name === "G" && form.name.trim().toLowerCase() === "escova"
              ? 40
              : "",
          commission_percent:
            name === "G" && form.name.trim().toLowerCase() === "escova"
              ? 40
              : form.commission_percent || 0,
          is_active: true,
        })),
    ]);
  const updateVariant = (index, key, value) =>
    setVariantsForm((previous) =>
      previous.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    );
  const handleSubmit = () => {
    if (!valid || pending) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
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
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            {canEdit && (
              <Button
                size="sm"
                className="rounded-xl gap-1.5"
                onClick={openNew}
              >
                <Plus className="w-4 h-4" /> Novo
              </Button>
            )}
          </div>
        }
      />

      <div className="px-5 space-y-5">
        {variantsQuery.isError && (
          <p role="alert">
            Não foi possível carregar as variações.{" "}
            <button onClick={() => variantsQuery.refetch()}>
              Tentar novamente
            </button>
          </p>
        )}
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
                  <div
                    key={svc.id}
                    className="bg-card rounded-xl border border-border/50 p-3.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      if (canEdit) openEdit(svc);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(variantsQuery.data || [])
                            .filter(
                              (v) => v.service_id === svc.id && v.is_active,
                            )
                            .map(
                              (v) =>
                                `${v.name}: ${formatBRL(v.price)} · ${v.duration_minutes}min`,
                            )
                            .join(" / ")}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {svc.duration_minutes}min
                          </span>
                          {svc.commission_percent > 0 && (
                            <span>{svc.commission_percent}% comissão</span>
                          )}
                        </div>
                      </div>
                      <p className="font-heading font-bold tracking-tight text-lg tabular-nums">
                        {formatBRL(svc.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <Sheet
          open={showForm}
          onOpenChange={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <SheetContent
            side="bottom"
            className="max-h-[85vh] rounded-t-3xl overflow-y-auto"
          >
            <SheetHeader className="pb-4">
              <SheetTitle className="font-heading">
                {editing ? "Editar Serviço" : "Novo Serviço"}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-8">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex: Corte Feminino"
                />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, price: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duração (min)</Label>
                  <Input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        duration_minutes: e.target.value,
                      }))
                    }
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Comissão (%)</Label>
                  <Input
                    type="number"
                    value={form.commission_percent}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        commission_percent: e.target.value,
                      }))
                    }
                    placeholder="40"
                  />
                </div>
                <div>
                  <Label className="text-xs">Retorno (dias)</Label>
                  <Input
                    type="number"
                    value={form.recurrence_days}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        recurrence_days: e.target.value,
                      }))
                    }
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="service-description">
                  Descrição do serviço
                </Label>
                <Textarea
                  id="service-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Explique o procedimento, benefícios e cuidados."
                />
              </div>
              <section className="rounded-2xl border p-4 space-y-3">
                <div>
                  <h3 className="font-semibold">Variações do serviço</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Um único serviço no catálogo, com opções de preço e duração.
                    Preencha os valores antes de salvar.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addVariants}>
                  Adicionar opções P / M / G
                </Button>
                {variantsForm.map((v, index) => (
                  <div
                    key={v.id || index}
                    className="border rounded-xl p-3 space-y-3 bg-background"
                  >
                    <div className="flex justify-between items-center">
                      <strong>Opção {v.name}</strong>
                      <label className="text-xs flex gap-2">
                        <input
                          type="checkbox"
                          checked={v.is_active}
                          onChange={(e) =>
                            updateVariant(index, "is_active", e.target.checked)
                          }
                        />
                        Ativa
                      </label>
                    </div>
                    <label className="block text-xs">
                      Nome da opção
                      <Input
                        value={v.name}
                        onChange={(e) =>
                          updateVariant(index, "name", e.target.value)
                        }
                      />
                    </label>
                    <label className="block text-xs">
                      Descrição
                      <Input
                        value={v.description}
                        onChange={(e) =>
                          updateVariant(index, "description", e.target.value)
                        }
                      />
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["price", "Preço (R$)"],
                        ["duration_minutes", "Duração (min)"],
                        ["commission_percent", "Comissão (%)"],
                      ].map(([key, label]) => (
                        <label key={key} className="text-xs">
                          {label}
                          <Input
                            type="number"
                            min={key === "duration_minutes" ? 1 : 0}
                            step={key === "duration_minutes" ? 1 : "0.01"}
                            max={key === "commission_percent" ? 100 : undefined}
                            value={v[key]}
                            onChange={(e) =>
                              updateVariant(index, key, e.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                    {!v.id && (
                      <button
                        className="text-xs text-destructive"
                        onClick={() =>
                          setVariantsForm((rows) =>
                            rows.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remover opção
                      </button>
                    )}
                  </div>
                ))}
              </section>
              {(createMutation.isError || updateMutation.isError) && (
                <p role="alert" className="text-sm text-destructive">
                  Não foi possível salvar. Confira os dados e tente novamente.
                </p>
              )}
              {!valid && (
                <p className="text-xs text-muted-foreground">
                  Informe nome, preço, duração positiva e comissão entre 0 e 100
                  para o serviço e cada opção.
                </p>
              )}
              <Button
                disabled={!valid || pending}
                onClick={handleSubmit}
                className="w-full rounded-full h-12 font-semibold"
              >
                {pending ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
