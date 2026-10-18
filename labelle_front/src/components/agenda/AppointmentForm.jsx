import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProfessionalServicesApi, ServiceVariantsApi } from "@/server/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { maskPhone } from "@/lib/phone";

export default function AppointmentForm({ open, onClose, onSubmit, services, professionals, clients, appointment, initialDate }) {
  // Só profissionais vinculadas ao serviço escolhido aparecem na lista —
  // evita agendar um serviço com quem não sabe fazer.
  const { data: professionalServices = [] } = useQuery({
    queryKey: ["professional-services"],
    queryFn: () => ProfessionalServicesApi.list({ limit: 1000 }),
  });
  const { data: variants = [] } = useQuery({ queryKey: ["service-variants"], queryFn: () => ServiceVariantsApi.list({ limit: 1000 }) });
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_id: "",
    service_id: "",
    service_variant_id: null,
    professional_id: "",
    date: initialDate || new Date().toISOString().split("T")[0],
    time: "09:00",
    notes: "",
  });

  useEffect(() => {
    if (appointment) {
      setForm({
        client_name: appointment.client_name || "",
        client_phone: appointment.client_phone || "",
        client_id: appointment.client_id || "",
        service_id: appointment.service_id || "",
        service_variant_id: appointment.service_variant_id || null,
        professional_id: appointment.professional_id || "",
        date: appointment.date || new Date().toISOString().split("T")[0],
        time: appointment.time || "09:00",
        notes: appointment.notes || "",
      });
    } else {
      setForm({
        client_name: "", client_phone: "", client_id: "",
        service_id: "",
    service_variant_id: null, professional_id: "",
        date: initialDate || new Date().toISOString().split("T")[0], time: "09:00", notes: "",
      });
    }
  }, [appointment, open, initialDate]);

  const selectedService = services?.find(s => s.id === form.service_id);

  const serviceVariants = variants.filter(v => v.service_id === form.service_id && v.is_active !== false);
  const selectedOption = variants.find(v => v.id === form.service_variant_id) || selectedService;

  // Sem serviço escolhido ainda, mostra todo mundo. Com serviço escolhido,
  // mostra só quem está vinculada — inclusive se ninguém estiver vinculado
  // ainda (lista vazia), para não deixar agendar com uma profissional que
  // não sabe fazer o serviço (ela receberia comissão por um trabalho que
  // não fez). É preciso configurar o vínculo em Profissionais antes.
  const qualifiedProfessionals = form.service_id
    ? professionals?.filter(p =>
        professionalServices.some(ps => ps.professional_id === p.id && ps.service_id === form.service_id)
      )
    : professionals;

  // Se trocar de serviço e a profissional escolhida não fizer o novo
  // serviço, limpa a seleção em vez de deixar um agendamento inválido.
  useEffect(() => {
    if (form.professional_id && !qualifiedProfessionals?.some(p => p.id === form.professional_id)) {
      setForm(prev => ({ ...prev, professional_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.service_id, professionalServices]);

  const handleClientSelect = (clientId) => {
    const client = clients?.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({ ...prev, client_id: clientId, client_name: client.name, client_phone: client.phone || "" }));
    }
  };

  const handleSubmit = () => {
    const professional = professionals?.find(p => p.id === form.professional_id);
    const payload = {
      ...form,
      service_name: selectedService?.name || "",
      professional_name: professional?.name || "",

    };
    onSubmit(payload);
  };

  const timeSlots = [];
  for (let h = 7; h <= 21; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
    timeSlots.push(`${String(h).padStart(2, "0")}:30`);
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading">{appointment ? "Editar Agendamento" : "Novo Agendamento"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-8">
          {clients?.length > 0 && (
            <div>
              <Label className="text-xs">Cliente Cadastrado</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.client_name} onChange={e => setForm(prev => ({ ...prev, client_name: e.target.value }))} placeholder="Nome da cliente" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <Input value={form.client_phone} onChange={e => setForm(prev => ({ ...prev, client_phone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Serviço</Label>
            <Select value={form.service_id} onValueChange={v => setForm(prev => ({ ...prev, service_id: v, service_variant_id: null }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar serviço..." /></SelectTrigger>
              <SelectContent>
                {services?.filter(s => s.is_active !== false).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} - {formatBRL(s.price)} ({s.duration_minutes}min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            {serviceVariants.length > 0 && <div className="mb-4"><Label>Opção do serviço</Label><Select value={form.service_variant_id || ""} onValueChange={v => setForm(prev => ({ ...prev, service_variant_id: v }))}><SelectTrigger><SelectValue placeholder="Escolher opção..." /></SelectTrigger><SelectContent>{serviceVariants.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {formatBRL(v.price)} ({v.duration_minutes}min)</SelectItem>)}</SelectContent></Select></div>}
            <Label className="text-xs">Profissional</Label>
            <Select
              value={form.professional_id}
              onValueChange={v => setForm(prev => ({ ...prev, professional_id: v }))}
              disabled={!form.service_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.service_id ? "Selecionar profissional..." : "Escolha um serviço primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {qualifiedProfessionals?.filter(p => p.is_active !== false).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.service_id && qualifiedProfessionals?.filter(p => p.is_active !== false).length === 0 && (
              <p className="text-xs text-destructive mt-1">
                Nenhuma profissional configurada para este serviço ainda. Cadastre em Profissionais → editar → "Serviços que realiza".
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Horário</Label>
              <Select value={form.time} onValueChange={v => setForm(prev => ({ ...prev, time: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedService && (
            <div className="bg-secondary/50 rounded-xl p-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Duração: {selectedOption.duration_minutes}min</span>
              <span className="font-semibold tabular-nums">{formatBRL(selectedOption.price)}</span>
            </div>
          )}
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observações..." rows={2} />
          </div>
          <Button disabled={!form.client_name.trim() || !form.service_id || !form.professional_id || (serviceVariants.length > 0 && !form.service_variant_id)} onClick={handleSubmit} className="w-full rounded-full h-12 font-semibold">
            {appointment ? "Atualizar" : "Agendar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}