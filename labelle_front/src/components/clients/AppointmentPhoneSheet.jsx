import {useState,useEffect} from "react";
import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {AppointmentsApi,ClientsApi,completeAppointmentPhone} from "@/server/api";
import {Sheet,SheetContent,SheetHeader,SheetTitle} from "@/components/ui/sheet";
import {hasPhone} from "@/lib/phonePending";
import {maskPhone,maskPhoneDisplay} from "@/lib/phone";
import {useUser} from "@/lib/auth";
export const sameClientName = value => String(value || "").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g," ");
export default function AppointmentPhoneSheet({appointment,onClose}) {
 const user=useUser(),qc=useQueryClient();
 const [phone,setPhone]=useState(""),[selected,setSelected]=useState([]);
 const appointments=useQuery({queryKey:["phone-pending-appointments",user?.id],queryFn:()=>AppointmentsApi.list({limit:10000,sort:"-date"}),enabled:!!appointment});
 const clients=useQuery({queryKey:["clients"],queryFn:()=>ClientsApi.list({limit:10000}),enabled:!!appointment});
 const others=(appointments.data || []).filter(a=>a.id!==appointment?.id && !a.client_id && !hasPhone(a.client_phone) && sameClientName(a.client_name)===sameClientName(appointment?.client_name));
 const existing=(clients.data || []).filter(c=>hasPhone(c.phone) && sameClientName(c.name)===sameClientName(appointment?.client_name));
 const save=useMutation({mutationFn:()=>completeAppointmentPhone({data:{id:appointment.id,phone,sameClientAppointmentIds:selected}}),onSuccess:()=>{for(const key of ["clients","appointments","professional-appointments","phone-pending-appointments"])qc.invalidateQueries({queryKey:[key]});onClose();}});
 useEffect(()=>{setPhone(appointment?.client_phone || "");setSelected([]);save.reset();},[appointment?.id]);
 return <Sheet open={!!appointment} onOpenChange={open=>{if(!open)onClose();}}><SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl"><SheetHeader><SheetTitle>Completar celular · {appointment?.client_name}</SheetTitle></SheetHeader>
 <form className="phone-completion-sheet" onSubmit={e=>{e.preventDefault();save.mutate();}}>
 <p>{appointment?.date?.split("-").reverse().join("/")} · {appointment?.time?.slice(0,5)} · {appointment?.professional_name}</p>
 <label>Celular com DDD<input autoFocus type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(maskPhone(e.target.value))} placeholder="(83) 99999-9999" required /></label>
 <p>Se este celular já estiver cadastrado, o atendimento será associado à cliente existente.</p>
 {existing.map(c=><button type="button" key={c.id} onClick={()=>setPhone(c.phone)}>Usar cadastro de {c.name} · {maskPhoneDisplay(c.phone)}</button>)}
 {others.length>0 && <fieldset><legend>Encontramos {others.length} outro(s) atendimento(s) com o mesmo nome. É a mesma cliente?</legend><p>Marque apenas os atendimentos que pertencem à mesma pessoa. O celular será preenchido e as pendências serão resolvidas juntos.</p>{others.map(a=><label className="same-client-option" key={a.id}><input type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(ids=>e.target.checked ? [...ids,a.id] : ids.filter(id=>id!==a.id))}/><span>{a.client_name} · {a.date?.split("-").reverse().join("/")} às {a.time?.slice(0,5)} · {a.professional_name}</span></label>)}</fieldset>}
 {appointments.isError && <p role="alert">Não foi possível conferir outros atendimentos. Você pode salvar somente este celular.</p>}
 {save.isError && <p role="alert">Não foi possível salvar. Confira o celular e os atendimentos selecionados. Nenhum vínculo foi confirmado.</p>}
 <button className="brand-button" disabled={!hasPhone(phone) || save.isPending}>{save.isPending ? "Salvando…" : selected.length ? `Salvar e associar ${selected.length+1} atendimentos` : "Salvar celular e cadastrar cliente"}</button>
 </form></SheetContent></Sheet>;
}
