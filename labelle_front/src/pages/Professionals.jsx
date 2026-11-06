import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProfessionalsApi, ProfessionalServicesApi, ServicesApi, AppointmentsApi, listUsers } from "@/server/api";
import { Plus, ArrowLeft, Link2, Trash2, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import { formatBRL } from "@/lib/format";
import { useUser } from "@/lib/auth";

const typeLabels = { fixo: "Fixo", comissao: "Comissão", aluguel: "Aluguel Cadeira" };
const typeColors = { fixo: "bg-blue-100 text-blue-700", comissao: "bg-emerald-100 text-emerald-700", aluguel: "bg-purple-100 text-purple-700" };

export default function Professionals() {
  const user = useUser();
  const canEdit = user?.role === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const search = location.search;
  const route = "/admin/profissionais";
  const updateSearch = (patch, replace = true) => navigate({ to: route, search: (previous) => ({ ...previous, ...patch }), replace });
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", type: "comissao", commission_percent: "40", rent_value: "", work_start: "09:00", work_end: "18:00", user_id: "",
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
    enabled: canEdit,
  });
  const queryClient = useQueryClient();

  const { data: professionals = [], isLoading, isSuccess: professionalsReady } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });

  const { data: professionalServices = [], isSuccess: professionalServicesReady } = useQuery({
    queryKey: ["professional-services"],
    queryFn: () => ProfessionalServicesApi.list({ limit: 1000 }),
  });

  useEffect(() => {
    if (!canEdit) return;
    if (search.view === "new") {
      if (!showForm || editing) openNew();
      return;
    }
    if (typeof search.professional === "string") {
      if (isLoading || !professionalsReady || !professionalServicesReady) return;
      const professional = professionals.find((item) => String(item.id) === search.professional);
      if (!professional) {
        updateSearch({ professional: undefined, view: undefined });
        setShowForm(false);
        setEditing(null);
      } else if (String(editing?.id) !== search.professional) openEdit(professional);
      return;
    }
    setShowForm(false);
    setEditing(null);
  }, [canEdit, search.professional, search.view, professionals, isLoading, professionalsReady, professionalServicesReady]);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentsApi.list({ sort: "-date", limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => ProfessionalsApi.create({
      data: {
        ...data, commission_percent: parseFloat(data.commission_percent) || 0,
        rent_value: parseFloat(data.rent_value) || 0,
      },
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ProfessionalsApi.update({
      id,
      attributes: {
        ...data, commission_percent: parseFloat(data.commission_percent) || 0,
        rent_value: parseFloat(data.rent_value) || 0,
      },
    }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }) => ProfessionalsApi.update({ id, attributes: { is_active: isActive } }),
  });

  const refreshProfessionals = () => {
    queryClient.invalidateQueries({ queryKey: ["professionals"] });
    queryClient.invalidateQueries({ queryKey: ["professional-services"] });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setConfirmRemoval(false);
    setActionError("");
    updateSearch({ professional: undefined, view: undefined });
  };

  const handleActiveChange = async (restore = false) => {
    if (!canEdit || !editing) return;
    setActionError("");
    try {
      await activeMutation.mutateAsync({ id: editing.id, isActive: restore });
      refreshProfessionals();
      closeForm();
    } catch {
      setActionError(restore ? "Não foi possível restaurar a profissional." : "Não foi possível excluir a profissional.");
    }
  };

  // Reconcilia os vínculos profissional<->serviço com o que foi marcado no
  // checklist: cria os que faltam, remove os que foram desmarcados.
  const syncServiceLinks = async (professionalId) => {
    const current = professionalServices.filter(ps => ps.professional_id === professionalId);
    const currentServiceIds = current.map(ps => ps.service_id);

    const toAdd = selectedServiceIds.filter(id => !currentServiceIds.includes(id));
    const toRemove = current.filter(ps => !selectedServiceIds.includes(ps.service_id));

    await Promise.all([
      ...toAdd.map(service_id => ProfessionalServicesApi.create({ data: { professional_id: professionalId, service_id } })),
      ...toRemove.map(ps => ProfessionalServicesApi.delete({ id: ps.id })),
    ]);
  };

  const openEdit = (p) => {
    if (!canEdit) return;
    setConfirmRemoval(false);
    setActionError("");
    setEditing(p);
    setForm({
      name: p.name || "", phone: p.phone || "", email: p.email || "", type: p.type || "comissao",
      commission_percent: String(p.commission_percent || "40"), rent_value: String(p.rent_value || ""),
      work_start: p.work_start || "09:00", work_end: p.work_end || "18:00", user_id: p.user_id || "",
    });
    setSelectedServiceIds(professionalServices.filter(ps => ps.professional_id === p.id).map(ps => ps.service_id));
    setShowForm(true);
  };

  const openNew = () => {
    if (!canEdit) return;
    setConfirmRemoval(false);
    setActionError("");
    setEditing(null);
    setForm({ name: "", phone: "", email: "", type: "comissao", commission_percent: "40", rent_value: "", work_start: "09:00", work_end: "18:00", user_id: "" });
    setSelectedServiceIds([]);
    setShowForm(true);
  };

  const toggleService = (serviceId) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!canEdit) return;
    setActionError("");
    setSaving(true);
    try {
      const professional = editing
        ? await updateMutation.mutateAsync({ id: editing.id, data: form })
        : await createMutation.mutateAsync(form);

      await syncServiceLinks(editing ? editing.id : professional.id);

      refreshProfessionals();
      closeForm();
    } catch {
      setActionError("Não foi possível salvar a profissional.");
    } finally {
      setSaving(false);
    }
  };

  const getProfRevenue = (profId) => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    return appointments
      .filter(a => a.professional_id === profId && a.status === "concluido" && a.date >= monthStart)
      .reduce((s, a) => s + (a.price || 0), 0);
  };

  const getProfAppointments = (profId) => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    return appointments.filter(a => a.professional_id === profId && a.status === "concluido" && a.date >= monthStart).length;
  };

  const visibleProfessionals = professionals.filter(prof => showInactive ? prof.is_active === false : prof.is_active !== false);
  const inactiveCount = professionals.filter(prof => prof.is_active === false).length;
  const actionPending = saving || activeMutation.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profissionais"
        subtitle={`${professionals.filter(prof => prof.is_active !== false).length} ativos`}
        action={
          <div className="flex gap-2">
            <Link to="/admin/mais"><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
            {canEdit && <Button size="sm" className="rounded-xl gap-1.5 min-h-11" onClick={() => updateSearch({ view: "new", professional: undefined }, false)}><Plus className="w-4 h-4" /> Novo</Button>}
          </div>
        }
      />

      <div className="px-5 space-y-3">
        {canEdit && <div className="flex gap-2" role="group" aria-label="Situação dos profissionais">
          <Button variant={showInactive ? "outline" : "default"} className="rounded-full min-h-11" aria-pressed={!showInactive} onClick={() => setShowInactive(false)}>Ativos</Button>
          <Button variant={showInactive ? "default" : "outline"} className="rounded-full min-h-11" aria-pressed={showInactive} onClick={() => setShowInactive(true)}>Inativos ({inactiveCount})</Button>
        </div>}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        ) : (
        visibleProfessionals.length === 0 ? <p className="text-sm text-muted-foreground py-6">Nenhum profissional {showInactive ? "inativo" : "ativo"}.</p> : visibleProfessionals.map((prof) => (
          <div key={prof.id} role={canEdit ? "button" : undefined} tabIndex={canEdit ? 0 : undefined} className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => canEdit && updateSearch({ professional: String(prof.id), view: "edit" }, false)} onKeyDown={event => { if (canEdit && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); updateSearch({ professional: String(prof.id), view: "edit" }, false); } }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-base font-heading font-bold tracking-tight text-primary">{prof.name?.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{prof.name}</p>
                  <Badge className={cn("text-[9px] border-0", typeColors[prof.type])}>{typeLabels[prof.type]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{prof.phone}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                  <span className="text-muted-foreground">{getProfAppointments(prof.id)} atendimentos</span>
                  <span className="font-medium tabular-nums">{formatBRL(getProfRevenue(prof.id))} no mês</span>
                  {prof.user_id && <span className="flex items-center gap-0.5 text-primary"><Link2 className="w-3 h-3" /> Vinculado</span>}
                </div>
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      <Sheet open={canEdit && showForm} onOpenChange={(open) => { if (!open && !actionPending) closeForm(); }}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">{confirmRemoval ? "Excluir profissional?" : editing ? "Editar Profissional" : "Novo Profissional"}</SheetTitle>
            {confirmRemoval && <SheetDescription>{editing?.name} sairá do catálogo e das novas agendas. O histórico será mantido.</SheetDescription>}
          </SheetHeader>
          {actionError && <p role="alert" className="text-sm text-destructive mb-3">{actionError}</p>}
          {confirmRemoval ? <div className="flex gap-3 pb-4">
            <Button variant="outline" className="flex-1 min-h-11" disabled={actionPending} onClick={() => setConfirmRemoval(false)}>Voltar</Button>
            <Button variant="destructive" className="flex-1 min-h-11 gap-2" disabled={actionPending} onClick={() => handleActiveChange()}><Trash2 className="w-4 h-4" />{actionPending ? "Excluindo..." : "Confirmar exclusão"}</Button>
          </div> : <div className="space-y-4 pb-8">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Fixo (Salário)</SelectItem>
                  <SelectItem value="comissao">Comissão</SelectItem>
                  <SelectItem value="aluguel">Aluguel de Cadeira</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Comissão (%)</Label>
                <Input type="number" value={form.commission_percent} onChange={e => setForm(p => ({ ...p, commission_percent: e.target.value }))} />
              </div>
              {form.type === "aluguel" && (
                <div>
                  <Label className="text-xs">Valor Aluguel (R$)</Label>
                  <Input type="number" value={form.rent_value} onChange={e => setForm(p => ({ ...p, rent_value: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início Expediente</Label>
                <Input type="time" value={form.work_start} onChange={e => setForm(p => ({ ...p, work_start: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Fim Expediente</Label>
                <Input type="time" value={form.work_end} onChange={e => setForm(p => ({ ...p, work_end: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Vincular Usuário (login)</Label>
              <Select value={form.user_id} onValueChange={v => setForm(p => ({ ...p, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um usuário..." /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role === "profissional").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Apenas usuários com role "profissional" aparecem aqui</p>
            </div>
            <div>
              <Label className="text-xs">Serviços que realiza</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Só quem estiver marcado aqui aparece para esse serviço na hora de agendar.
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {services.filter(s => s.is_active !== false).map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm bg-secondary/40 rounded-lg px-3 py-2">
                    <Checkbox
                      checked={selectedServiceIds.includes(s.id)}
                      onCheckedChange={() => toggleService(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={actionPending} className="w-full rounded-full h-12 font-semibold">
              {saving ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
            </Button>
            {editing && (editing.is_active === false ?
              <Button variant="outline" className="w-full min-h-11 gap-2" disabled={actionPending} onClick={() => handleActiveChange(true)}><RotateCcw className="w-4 h-4" />Restaurar profissional</Button> :
              <Button variant="outline" className="w-full min-h-11 gap-2 text-destructive" disabled={actionPending} onClick={() => setConfirmRemoval(true)}><Trash2 className="w-4 h-4" />Excluir profissional</Button>
            )}
          </div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
