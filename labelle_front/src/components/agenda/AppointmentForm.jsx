import {useUser} from "@/lib/auth";
import { hasPhone } from "@/lib/phonePending";
import { normalizeSearch } from "@/lib/serviceCatalog";
import { clientMatchesSearch, clientWithExactPhone } from "@/lib/clientIdentification";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfessionalServicesApi, ServiceVariantsApi, completeAppointmentPhone } from "@/server/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { maskPhone, isValidPhone } from "@/lib/phone";
import { normalizePhone } from "@/lib/clientUtils";
import { ClientsApi } from "@/server/api";

export default function AppointmentForm({ open, onClose, onSubmit, services, professionals, clients, appointment, initialDate, initialTime, initialProfessional, initialBooking, title, submitError, isSaving = false, footerActions }) {
  const queryClient = useQueryClient();
  const admin=useUser()?.role==="admin";
  const [referral,setReferral]=useState(false),[editComment,setEditComment]=useState("");
  // Só profissionais vinculadas ao serviço escolhido aparecem na lista —
  // evita agendar um serviço com quem não sabe fazer.
  const professionalServicesQuery = useQuery({
    queryKey: ["professional-services"],
    queryFn: () => ProfessionalServicesApi.list({ limit: 1000 }),
  });
  const professionalServices = professionalServicesQuery.data || [];
  const variantsQuery = useQuery({
    queryKey: ["service-variants"],
    queryFn: () => ServiceVariantsApi.list({ limit: 1000 }),
  });
  const variants = variantsQuery.data || [];
  const [contactError,setContactError] = useState("");
  const [savingContact,setSavingContact] = useState(false);
  const [clientSuggestions,setClientSuggestions] = useState(false);
  const [clientMode,setClientMode] = useState("phone");
  const [clientSearch,setClientSearch] = useState("");
  const [serviceSearch,setServiceSearch] = useState("");
  const [serviceSuggestions,setServiceSuggestions] = useState(false);
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
        time: appointment.time?.slice(0, 5) || "09:00",
        notes: appointment.notes || "",
      });
    } else {
      setForm({
        client_name: initialBooking?.client_name || "", client_phone: initialBooking?.client_phone || "", client_id: initialBooking?.client_id || "",
        service_id: initialBooking?.service_id || "",
    service_variant_id: initialBooking?.service_variant_id || null, professional_id: initialProfessional || initialBooking?.professional_id || "",
        date: initialDate || new Date().toISOString().split("T")[0], time: initialTime || "09:00", notes: "",
      });
    }
    setReferral(Boolean(appointment?.professional_referral || initialBooking?.professional_referral));setEditComment("");
    setClientMode(appointment || initialBooking?.client_id ? "select" : "phone");
    setClientSearch(appointment?.client_name || (initialBooking?.client_id ? initialBooking.client_name : ""));
    setClientSuggestions(false);setServiceSuggestions(false);setContactError("");
    setServiceSearch(appointment ? services?.find(s=>s.id===appointment.service_id)?.name || "" : services?.find(s=>s.id===initialBooking?.service_id)?.name || "");
  }, [appointment, open, initialDate, initialTime, initialProfessional, initialBooking?.id]);

  const selectedService = services?.find(s => s.id === form.service_id);

  const serviceVariantRows = variants.filter(v => v.service_id === form.service_id);
  const serviceVariants = serviceVariantRows.filter(v => v.is_active !== false);
  const retainedVariant = appointment && appointment.service_variant_id === form.service_variant_id &&
    variants.find(v => v.id === form.service_variant_id && v.service_id === form.service_id);
  const variantOptions = retainedVariant && !serviceVariants.some(v => v.id === retainedVariant.id)
    ? [...serviceVariants, retainedVariant]
    : serviceVariants;
  const selectedOption = variants.find(v => v.id === form.service_variant_id) || selectedService;
  const hasOnlyInactiveVariants = (serviceId) => {
    const rows = variants.filter(v => v.service_id === serviceId);
    return rows.length > 0 && !rows.some(v => v.is_active !== false);
  };

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
    if (professionalServicesQuery.isSuccess && form.professional_id && !qualifiedProfessionals?.some(p => p.id === form.professional_id)) {
      setForm(prev => ({ ...prev, professional_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.service_id, professionalServices, professionalServicesQuery.isSuccess]);

  const phoneDigits = normalizePhone(form.client_phone);
  const completePhone = isValidPhone(form.client_phone);
  // Consulta exata no backend: a lista carregada para o seletor pode estar paginada.
  const phoneLookup = useQuery({
    queryKey: ["staff-client-by-phone", phoneDigits],
    queryFn: () => ClientsApi.list({ filter: { phone_normalized: `55${phoneDigits}` }, limit: 1 }),
    enabled: open && !appointment && clientMode === "phone" && completePhone,
  });
  const phoneClient = completePhone && phoneLookup.isSuccess
    ? clientWithExactPhone(phoneLookup.data, form.client_phone) : null;
  useEffect(() => {
    if (!appointment && clientMode === "phone" && phoneClient) {
      setForm(prev => ({ ...prev, client_name: phoneClient.name }));
    }
  }, [appointment, clientMode, phoneClient?.id, phoneDigits]);
  useEffect(()=>{
    if(appointment)return;
    const client = clientMode === "select"
      ? clients?.find(c => c.id === form.client_id)
      : phoneClient;
    if(client)setReferral(client.referring_professional_id===form.professional_id);
    else if(!initialBooking?.professional_referral)setReferral(false);
  },[form.client_id,form.professional_id,clients,appointment,clientMode,phoneClient?.id]);
  const handleClientSelect = (clientId) => {
    const client = clients?.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({ ...prev, client_id: clientId, client_name: client.name, client_phone: client.phone || "" }));
      setClientSearch(client.name);
    }
  };
  const changeClientMode = (mode) => {
    setClientMode(mode);
    setClientSearch("");
    setClientSuggestions(false);
    setContactError("");
    setForm(prev => ({ ...prev, client_id: "", client_name: "", client_phone: "" }));
  };

  const handleSubmit = async () => {
    setContactError("");
    if (appointment && form.client_phone !== (appointment.client_phone || "")) {
      if (!hasPhone(form.client_phone)) { setContactError("Informe um celular com DDD ou mantenha o número atual."); return; }
      setSavingContact(true);
      try { await completeAppointmentPhone({data:{id:appointment.id,phone:form.client_phone}});
        for (const key of ["clients","phone-pending-appointments","appointments","professional-appointments"]) queryClient.invalidateQueries({queryKey:[key]}); }
      catch { setContactError("Não foi possível salvar o celular. Confira o número e tente novamente."); setSavingContact(false); return; }
      setSavingContact(false);
    }
    const professional = professionals?.find(p => p.id === form.professional_id);
    const payload = {
      ...form,
      ...(admin ? {professional_referral:referral} : {}),
      ...(appointment?.status==="concluido" ? {edit_comment:editComment} : {}),
      service_name: selectedService?.name || "",
      professional_name: professional?.name || "",

    };
    if (appointment) {
      const { client_id, client_name, client_phone, ...editable } = payload;
      onSubmit(editable);
    } else onSubmit(payload);
  };

  const timeSlots = [];
  for (let h = 0; h <= 23; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
    timeSlots.push(`${String(h).padStart(2, "0")}:30`);
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="appointment-sheet">
        <SheetHeader className="appointment-header">
          <SheetTitle className="font-heading">{title || (appointment ? "Editar Agendamento" : "Novo Agendamento")}</SheetTitle>
        </SheetHeader>
        <div className="appointment-body">
          {!appointment && <div className="appointment-wide flex gap-2" role="group" aria-label="Identificar cliente">
            <Button type="button" variant={clientMode === "select" ? "default" : "outline"} onClick={() => changeClientMode("select")}>Selecionar cliente</Button>
            <Button type="button" variant={clientMode === "phone" ? "default" : "outline"} onClick={() => changeClientMode("phone")}>Informar telefone</Button>
          </div>}
          <div className="appointment-pair appointment-wide">
            {(appointment || clientMode === "select") ? <div>
              <Label className="text-xs">{appointment ? "Nome" : "Buscar cliente por nome ou telefone"}</Label>
              <Input aria-label="Cliente" disabled={!!appointment} role="combobox" aria-expanded={clientSuggestions} aria-controls="booking-client-options" aria-autocomplete="list" autoComplete="off" value={appointment ? form.client_name : clientSearch} onFocus={()=>setClientSuggestions(true)} onKeyDown={e=>{if(e.key==="Escape")setClientSuggestions(false);}} onChange={e => {setClientSearch(e.target.value);setForm(prev => ({ ...prev, client_id:"", client_phone:"", client_name:"" }));setClientSuggestions(true);}} placeholder="Nome ou parte do telefone" />
              {!appointment && clientSuggestions && <div id="booking-client-options" role="listbox" aria-label="Clientes existentes" className="booking-search-results">{clients?.filter(c=>clientMatchesSearch(c, clientSearch)).slice(0,30).map(c=><button type="button" role="option" aria-selected={form.client_id===c.id} key={c.id} onClick={()=>{handleClientSelect(c.id);setClientSuggestions(false);}}>{c.name}<small>{c.phone ? maskPhone(c.phone) : "Sem telefone"}</small></button>)}</div>}
            </div> : <div>
              <Label className="text-xs">Nome</Label>
              <Input aria-label="Nome da cliente" disabled={!!phoneClient} value={phoneClient?.name || form.client_name} onChange={e=>setForm(prev=>({...prev,client_name:e.target.value}))} placeholder="Nome da nova cliente" />
            </div>}
            <div>
              <Label className="text-xs">{appointment ? "WhatsApp (opcional)" : clientMode === "phone" ? "Telefone com DDD (10 ou 11 dígitos)" : "Telefone da cliente selecionada"}</Label>
              <Input aria-label="Telefone da cliente" disabled={!appointment && clientMode === "select"} value={form.client_phone} onChange={e => {
                const raw = e.target.value;
                const digits = normalizePhone(raw);
                setForm(prev => ({ ...prev, client_id: "", client_name: phoneClient ? "" : prev.client_name, client_phone: digits.length > 11 ? raw : maskPhone(raw) }));
                setContactError(digits.length > 11 ? "Informe apenas 10 ou 11 dígitos com DDD." : "");
              }} placeholder="(00) 00000-0000" />
              {!appointment && clientMode === "phone" && form.client_phone && !completePhone && <p role="alert" className="text-xs text-destructive">Informe o telefone completo com DDD (10 ou 11 dígitos).</p>}
              {!appointment && clientMode === "phone" && completePhone && phoneLookup.isFetching && <p role="status" className="text-xs">Consultando telefone…</p>}
              {!appointment && clientMode === "phone" && completePhone && phoneLookup.isError && <p role="alert" className="text-xs text-destructive">Não foi possível consultar o telefone. Tente novamente.</p>}
              {!appointment && clientMode === "phone" && phoneClient && <p role="status" className="text-xs">✓ Cliente já cadastrada: {phoneClient.name}</p>}
              {!appointment && clientMode === "phone" && completePhone && phoneLookup.isSuccess && !phoneClient && <p className="text-xs">Telefone não cadastrado. Informe o nome para criar o cadastro ao salvar.</p>}
              {!appointment && clientMode === "phone" && !form.client_phone && <p className="text-xs text-muted-foreground">Sem telefone, o agendamento ficará sem cadastro vinculado.</p>}
            </div>
          </div>
          {variantsQuery.isError && (
            <div role="alert" className="text-sm text-destructive">
              Não foi possível carregar as opções dos serviços.{' '}
              <button type="button" className="underline" onClick={() => variantsQuery.refetch()}>
                Tentar novamente
              </button>
            </div>
          )}
          {professionalServicesQuery.isError && (
            <div role="alert" className="text-sm text-destructive">
              Não foi possível carregar os vínculos das profissionais.{' '}
              <button type="button" className="underline" onClick={() => professionalServicesQuery.refetch()}>
                Tentar novamente
              </button>
            </div>
          )}
          <div>
            <Label className="text-xs">Serviço</Label>
            <Input aria-label="Buscar serviço" role="combobox" aria-expanded={serviceSuggestions} aria-controls="booking-service-options" aria-autocomplete="list" autoComplete="off" disabled={!variantsQuery.isSuccess} value={serviceSearch || (!serviceSuggestions ? selectedService?.name || "" : "")} onFocus={()=>setServiceSuggestions(true)} onKeyDown={e=>{if(e.key==="Escape")setServiceSuggestions(false);}} onChange={e=>{setServiceSearch(e.target.value);setServiceSuggestions(true);setForm(prev=>({...prev,service_id:"",service_variant_id:null}));}} placeholder="Digite o serviço…" />
            {serviceSuggestions && <div id="booking-service-options" role="listbox" aria-label="Serviços disponíveis" className="booking-search-results">{services?.filter(s=>s.is_active!==false && (!hasOnlyInactiveVariants(s.id) || (appointment && s.id===appointment.service_id)) && normalizeSearch(s.name).includes(normalizeSearch(serviceSearch))).map(s=><button type="button" role="option" aria-selected={form.service_id===s.id} key={s.id} onClick={()=>{setForm(prev=>({...prev,service_id:s.id,service_variant_id:null}));setServiceSearch(s.name);setServiceSuggestions(false);}}>{s.name}<small>{formatBRL(s.price)} · {s.duration_minutes} min</small></button>)}</div>}

          </div>
          <div>
            {serviceVariantRows.length > 0 && <div className="appointment-variant"><Label>Opção</Label><Select value={form.service_variant_id || ""} onValueChange={v => setForm(prev => ({ ...prev, service_variant_id: v }))}><SelectTrigger disabled={!variantsQuery.isSuccess}><SelectValue placeholder="Escolher opção..." /></SelectTrigger><SelectContent>{variantOptions.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {formatBRL(v.price)} ({v.duration_minutes}min)</SelectItem>)}</SelectContent></Select></div>}
            <Label className="text-xs">Profissional</Label>
            <Select
              value={form.professional_id}
              onValueChange={v => setForm(prev => ({ ...prev, professional_id: v }))}
              disabled={!form.service_id && !form.professional_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.service_id || form.professional_id ? "Selecionar profissional..." : "Escolha um serviço primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {qualifiedProfessionals?.filter(p => p.is_active !== false).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.service_id && qualifiedProfessionals?.filter(p => p.is_active !== false).length === 0 && (
              <p className="text-xs text-destructive mt-1">
                Nenhuma profissional habilitada.
              </p>
            )}
          </div>
          <div className="appointment-referral appointment-wide">
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={referral} disabled={!admin} onChange={e=>setReferral(e.target.checked)}/>Cliente desta profissional</label>
          </div>

          <div className="appointment-pair appointment-wide">
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
            <div className="appointment-summary appointment-wide">
              <span className="text-muted-foreground">Duração: {selectedOption.duration_minutes}min</span>
              <span className="font-semibold tabular-nums">{formatBRL(selectedOption.price)}</span>
            </div>
          )}
          {appointment?.status==="concluido" && <div className="appointment-comment"><Label>Comentário da alteração (opcional)</Label><Textarea aria-label="Comentário da alteração após conclusão" value={editComment} onChange={e=>setEditComment(e.target.value)} rows={2} placeholder="Comentário"/></div>}
          <div className={appointment?.status === "concluido" ? "" : "appointment-wide"}>
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observações..." rows={2} />
          </div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          {contactError && <p role="alert" className="text-sm text-destructive">{contactError}</p>}
          {footerActions && <div className="appointment-wide">{footerActions}</div>}
        </div>
        <div className="appointment-footer">
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button disabled={isSaving || savingContact || !form.date || !form.time || !variantsQuery.isSuccess || !professionalServicesQuery.isSuccess || !form.client_name.trim() || (!appointment && clientMode === "select" && !form.client_id) || (!appointment && clientMode === "phone" && form.client_phone && (!completePhone || !phoneLookup.isSuccess || phoneLookup.isFetching)) || !form.service_id || !form.professional_id || (serviceVariantRows.length > 0 && !form.service_variant_id)} onClick={handleSubmit} className="font-semibold">
            {isSaving ? "Salvando…" : appointment ? "Atualizar" : "Agendar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}