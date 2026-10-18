import StatCard from "@/components/ui/StatCard";
import {useState} from "react";
import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {ClientsApi,AppointmentsApi,completeAppointmentPhone} from "@/server/api";
import {PhoneOff,Phone,Check} from "lucide-react";
import {hasPhone,phonePendingRecords} from "@/lib/phonePending";
import {maskPhone,maskPhoneDisplay} from "@/lib/phone";
import {useUser} from "@/lib/auth";

export default function PhonePendingPanel({compact = false}) {
  const user=useUser(), queryClient=useQueryClient();
  const [filter,setFilter]=useState("phone"),[editing,setEditing]=useState(null),[phone,setPhone]=useState("");
  const clientsQuery=useQuery({queryKey:["clients"],queryFn:()=>ClientsApi.list({limit:10000})});
  const appointmentsQuery=useQuery({queryKey:["phone-pending-appointments",user?.id],queryFn:()=>AppointmentsApi.list({limit:10000,sort:"-date"})});
  const records=phonePendingRecords(clientsQuery.data || [],appointmentsQuery.data || []);
  const missing=records.filter(r=>r.missing), unlinked=records.filter(r=>r.kind==="appointment");
  const rows=filter === "phone" ? missing : unlinked;
  const save=useMutation({mutationFn:({record,phone})=>record.kind === "appointment" ? completeAppointmentPhone({data:{id:record.id,phone}}) : ClientsApi.update({id:record.id,attributes:{phone}}),onSuccess:()=>{
    for(const key of ["clients","appointments","professional-appointments","phone-pending-appointments"]) queryClient.invalidateQueries({queryKey:[key]});
    setEditing(null);setPhone("");
  }});
  if (compact) return <StatCard title="Pendentes de celular" value={clientsQuery.isPending || appointmentsQuery.isPending ? "…" : clientsQuery.isError || appointmentsQuery.isError ? "Indisponível" : `${missing.length}/${records.length}`} icon={PhoneOff} />;
  if(clientsQuery.isPending || appointmentsQuery.isPending) return <section className="phone-pending-panel" role="status">Carregando pendências de celular…</section>;
  if(clientsQuery.isError || appointmentsQuery.isError) return <section className="phone-pending-panel" role="alert">Não foi possível carregar as pendências. <button onClick={()=>{clientsQuery.refetch();appointmentsQuery.refetch();}}>Tentar novamente</button></section>;
  return <section className="phone-pending-panel" aria-label="Pendências de celular">
    <div className="phone-pending-heading"><PhoneOff size={23}/><div><h2><strong>{missing.length}/{records.length}</strong> pendentes de celular</h2><p>Registros de clientes e atendimentos sem vínculo. Agendar continua liberado; complete o celular depois.</p></div></div>
    <div className="phone-pending-filters"><button aria-pressed={filter==="phone"} onClick={()=>setFilter("phone")}>Sem celular ({missing.length})</button><button aria-pressed={filter==="unlinked"} onClick={()=>setFilter("unlinked")}>Sem cadastro vinculado ({unlinked.length})</button></div>
    <p className="phone-pending-help">Cada atendimento sem cadastro aparece separadamente. Nomes iguais podem ser pessoas diferentes.</p>
    <div className="phone-pending-list">{!rows.length && <p className="p-4 text-sm">Nenhuma pendência nesta lista.</p>}{rows.map(record=><div className="phone-pending-row" key={record.key}>
      <div><strong>{record.name || "Nome não informado"}</strong><small>{record.kind === "appointment" ? `${record.date?.split("-").reverse().join("/")} · ${record.professional || "Atendimento sem cadastro"}` : "Cliente cadastrado"}</small><small>{record.missing ? "Celular não preenchido ou incompleto" : `${maskPhoneDisplay(record.phone)} · falta vincular ao cadastro`}</small></div>
      {(record.kind === "appointment" || user?.role === "admin") && <button className="phone-pending-edit" onClick={()=>{setEditing(record.key);setPhone(record.phone || "");save.reset();}}><Phone size={14}/>{record.missing ? "Preencher celular" : "Vincular cadastro"}</button>}
      {editing===record.key && <form className="phone-pending-form" onSubmit={e=>{e.preventDefault();save.mutate({record,phone});}}>
        <label>Celular com DDD<input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(maskPhone(e.target.value))} placeholder="(83) 99999-9999" /></label>
        <button disabled={!hasPhone(phone) || save.isPending}><Check size={14}/>{save.isPending ? "Salvando…" : "Salvar celular"}</button><button type="button" onClick={()=>setEditing(null)}>Cancelar</button>
        {save.isError && <p role="alert">Não foi possível salvar. Confira o número e tente novamente.</p>}
      </form>}
    </div>)}</div>
  </section>;
}
