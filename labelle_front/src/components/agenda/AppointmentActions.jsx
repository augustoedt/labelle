import {useState,useEffect} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import {AppointmentsApi,rescheduleAppointment} from "@/server/api";
import {Sheet,SheetContent,SheetHeader,SheetTitle} from "@/components/ui/sheet";
import {Button} from "@/components/ui/button";
import NextAppointmentSheet from "@/components/agenda/NextAppointmentSheet";
export default function AppointmentActions({appointment,onChanged}) {
 const [mode,setMode]=useState(null),[date,setDate]=useState(""),[time,setTime]=useState("");
 const qc=useQueryClient(), a=appointment;
 const save=useMutation({mutationFn:()=>mode==="cancel" ? AppointmentsApi.cancel({id:a.id}) : rescheduleAppointment({data:{id:a.id,date,time}}),onSuccess:()=>{for(const key of ["appointments","professional-appointments","phone-pending-appointments"])qc.invalidateQueries({queryKey:[key]});setMode(null);onChanged?.();}});
 useEffect(()=>{setDate(a?.date || "");setTime(a?.time?.slice(0,5) || "");save.reset();},[mode,a?.id]);
 if(!a)return null;
 const canMove=["agendado","confirmado"].includes(a.status),canCancel=["agendado","confirmado","em_atendimento"].includes(a.status);
 return <div className="appointment-actions" onClick={e=>e.stopPropagation()}>
 {canMove && <Button type="button" size="sm" variant="outline" onClick={()=>setMode("reschedule")}>Reagendar</Button>}
 {canCancel && <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={()=>setMode("cancel")}>Cancelar agendamento</Button>}
 {a.status==="concluido" && <Button type="button" size="sm" variant="outline" onClick={()=>setMode("next")}>Agendar próxima visita</Button>}
 <NextAppointmentSheet appointment={mode==="next" ? a : null} onClose={()=>setMode(null)}/>
 <Sheet open={mode==="reschedule" || mode==="cancel"} onOpenChange={open=>{if(!open)setMode(null);}}><SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl"><SheetHeader><SheetTitle>{mode==="cancel" ? "Cancelar agendamento" : "Reagendar atendimento"} · {a.client_name}</SheetTitle></SheetHeader>
 <form className="phone-completion-sheet" onSubmit={e=>{e.preventDefault();save.mutate();}}>
 {mode==="cancel" ? <p>Confirma o cancelamento de {a.date?.split("-").reverse().join("/")} às {a.time?.slice(0,5)}? O histórico será mantido.</p> : <><p>{a.service_name} · {a.professional_name}. Escolha a nova data e horário.</p><label>Nova data<input aria-label="Nova data" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Novo horário<input aria-label="Novo horário" type="time" value={time} onChange={e=>setTime(e.target.value)} required/></label></>}
 {save.isError && <p role="alert">Não foi possível {mode==="cancel" ? "cancelar" : "reagendar"}. Confira o status, expediente e disponibilidade e tente novamente.</p>}
 <Button disabled={save.isPending || (mode==="reschedule" && (!date || !time))}>{save.isPending ? "Salvando…" : mode==="cancel" ? "Confirmar cancelamento" : "Confirmar reagendamento"}</Button>
 </form></SheetContent></Sheet>
 </div>;
}
