import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProfessionalsApi, AppointmentsApi, listUsers } from "@/server/api";
import { Plus, ArrowLeft, Link2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";

const typeLabels = { fixo: "Fixo", comissao: "Comissão", aluguel: "Aluguel Cadeira" };
const typeColors = { fixo: "bg-blue-100 text-blue-700", comissao: "bg-emerald-100 text-emerald-700", aluguel: "bg-purple-100 text-purple-700" };

export default function Professionals() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", type: "comissao", commission_percent: "40", rent_value: "", work_start: "09:00", work_end: "18:00", user_id: "",
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
  });
  const queryClient = useQueryClient();

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => ProfessionalsApi.list(),
  });

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["professionals"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ProfessionalsApi.update({
      id,
      attributes: {
        ...data, commission_percent: parseFloat(data.commission_percent) || 0,
        rent_value: parseFloat(data.rent_value) || 0,
      },
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["professionals"] }); setShowForm(false); setEditing(null); },
  });

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "", phone: p.phone || "", email: p.email || "", type: p.type || "comissao",
      commission_percent: String(p.commission_percent || "40"), rent_value: String(p.rent_value || ""),
      work_start: p.work_start || "09:00", work_end: p.work_end || "18:00", user_id: p.user_id || "",
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", type: "comissao", commission_percent: "40", rent_value: "", work_start: "09:00", work_end: "18:00", user_id: "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Profissionais"
        subtitle={`${professionals.length} cadastrados`}
        action={
          <div className="flex gap-2">
            <Link to="/mais"><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <Button size="sm" className="rounded-xl gap-1.5" onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
          </div>
        }
      />

      <div className="px-5 space-y-3">
        {professionals.map((prof) => (
          <div key={prof.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4" onClick={() => openEdit(prof)}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-base font-heading font-bold text-primary">{prof.name?.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{prof.name}</p>
                  <Badge className={cn("text-[9px] border-0", typeColors[prof.type])}>{typeLabels[prof.type]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{prof.phone}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-muted-foreground">{getProfAppointments(prof.id)} atendimentos</span>
                  <span className="font-medium">R$ {getProfRevenue(prof.id).toFixed(0)} no mês</span>
                  {prof.user_id && <span className="flex items-center gap-0.5 text-primary"><Link2 className="w-3 h-3" /> Vinculado</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={showForm} onOpenChange={() => { setShowForm(false); setEditing(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-heading">{editing ? "Editar Profissional" : "Novo Profissional"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-8">
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
              <p className="text-[10px] text-muted-foreground mt-1">Apenas usuários com role "profissional" aparecem aqui</p>
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
