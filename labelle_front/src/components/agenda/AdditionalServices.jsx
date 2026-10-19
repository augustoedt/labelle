import {useState} from "react";
import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {AppointmentServicesApi,ServicesApi,ServiceVariantsApi,ProfessionalsApi,ProfessionalServicesApi} from "@/server/api";
import {useUser} from "@/lib/auth";
import CommissionEditor from "@/components/agenda/CommissionEditor";
import {formatBRL} from "@/lib/format";
import {Button} from "@/components/ui/button";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
export default function AdditionalServices({appointment}) {
 const user=useUser(),qc=useQueryClient(),admin=user?.role==="admin";
 const [serviceId,setServiceId]=useState(""),[variantId,setVariantId]=useState(""),[professionalId,setProfessionalId]=useState(""),[comment,setComment]=useState("");
 const services=useQuery({queryKey:["services"],queryFn:()=>ServicesApi.list({limit:1000})});
 const variants=useQuery({queryKey:["service-variants"],queryFn:()=>ServiceVariantsApi.list({limit:1000})});
 const professionals=useQuery({queryKey:["professionals"],queryFn:()=>ProfessionalsApi.list({limit:1000})});
 const links=useQuery({queryKey:["professional-services"],queryFn:()=>ProfessionalServicesApi.list({limit:1000})});
 const items=useQuery({queryKey:["appointment-services",appointment.id],queryFn:()=>AppointmentServicesApi.list({filter:{appointment_id:appointment.id},limit:10000})});
 const owner=(professionals.data || []).some(p=>p.id===appointment.professional_id && p.user_id===user?.id);
 const canManage=(admin || owner) && appointment.status!=="cancelado" && (appointment.status!=="concluido" || admin);
 const invalidate=()=>{for(const key of ["appointment-services","commission-items","appointments","professional-appointments","commission-appointments","transactions","financial-edits"])qc.invalidateQueries({queryKey:[key]});};
 const save=useMutation({mutationFn:()=>AppointmentServicesApi.create({data:{appointment_id:appointment.id,service_id:serviceId,professional_id:professionalId,...(variantId?{service_variant_id:variantId}:{}),unplanned:appointment.status==="em_atendimento",edit_comment:comment}}),onSuccess:()=>{setServiceId("");setVariantId("");setProfessionalId("");setComment("");invalidate();}});
 const assign=useMutation({mutationFn:({id,professional_id})=>AppointmentServicesApi.update({id,attributes:{professional_id,edit_comment:comment}}),onSuccess:invalidate});
 const remove=useMutation({mutationFn:id=>AppointmentServicesApi.delete({id}),onSuccess:invalidate});
 const options=(variants.data || []).filter(v=>v.service_id===serviceId && v.is_active!==false);
 const qualified=id=>(professionals.data || []).filter(p=>p.is_active!==false && (admin || p.id===appointment.professional_id) && (links.data || []).some(l=>l.professional_id===p.id && l.service_id===id));
 const selectedProfessionals=qualified(serviceId);
 const ready=services.isSuccess && variants.isSuccess && professionals.isSuccess && links.isSuccess;
 return <section className="additional-services" aria-label="Serviços adicionais" onClick={e=>e.stopPropagation()}>
 <h3>Serviços adicionais por profissional</h3>
 {items.isPending && <p role="status">Carregando serviços adicionais…</p>}
 {(items.isError || services.isError || variants.isError || professionals.isError || links.isError) && <p role="alert">Não foi possível carregar os serviços e profissionais.</p>}
 {(items.data || []).map(item=><div className="additional-service-row" key={item.id}>
 <strong>{item.service_name}</strong><span>{formatBRL(item.price,{decimals:2})} · {item.professional_name || appointment.professional_name}</span>
 <small>{(appointment.referral_professional_id || (appointment.professional_referral ? appointment.professional_id : null)) === (item.professional_id || appointment.professional_id) ? "Serviço da profissional que indicou: bônus de +15 p.p. em Pix/dinheiro ou +10 p.p. no cartão." : "Somente comissão base para quem executa; sem bônus de indicação neste serviço."}</small>
 {admin && appointment.status!=="cancelado" && <Select value={item.professional_id || appointment.professional_id} onValueChange={id=>assign.mutate({id:item.id,professional_id:id})}><SelectTrigger aria-label={`Profissional de ${item.service_name}`}><SelectValue /></SelectTrigger><SelectContent>{[...(professionals.data || []).filter(p=>p.id===(item.professional_id || appointment.professional_id)),...qualified(item.service_id).filter(p=>p.id!==(item.professional_id || appointment.professional_id))].map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>}
 <CommissionEditor record={item} kind="item" completed={appointment.status==="concluido"}/>
 {canManage && <button type="button" className="text-sm text-destructive" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}>Remover serviço adicional</button>}
 </div>)}
 {canManage && <div className="additional-service-form">
 <Select value={serviceId} onValueChange={id=>{setServiceId(id);setVariantId("");setProfessionalId(qualified(id).some(p=>p.id===appointment.professional_id)?appointment.professional_id:"");}}><SelectTrigger aria-label="Adicionar serviço"><SelectValue placeholder="Adicionar serviço…"/></SelectTrigger><SelectContent>{(services.data || []).filter(s=>s.is_active!==false && (!(variants.data || []).some(v=>v.service_id===s.id) || (variants.data || []).some(v=>v.service_id===s.id && v.is_active!==false))).map(s=><SelectItem key={s.id} value={s.id}>{s.name} · {formatBRL(s.price)}</SelectItem>)}</SelectContent></Select>
 {options.length>0 && <Select value={variantId} onValueChange={setVariantId}><SelectTrigger aria-label="Opção do serviço adicional"><SelectValue placeholder="Escolha P/M/G ou outra opção"/></SelectTrigger><SelectContent>{options.map(v=><SelectItem key={v.id} value={v.id}>{v.name} · {formatBRL(v.price)}</SelectItem>)}</SelectContent></Select>}
 <Select value={professionalId} onValueChange={setProfessionalId}><SelectTrigger aria-label="Profissional do serviço adicional"><SelectValue placeholder="Quem fará este serviço?"/></SelectTrigger><SelectContent>{selectedProfessionals.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
 {serviceId && ready && !selectedProfessionals.length && <p role="alert">Vincule uma profissional ativa a este serviço em Profissionais.</p>}
 {appointment.status==="concluido" && <label>Comentário da inclusão ou troca de profissional<textarea aria-label="Comentário do serviço adicional" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Motivo da alteração após conclusão"/>{!comment.trim() && <small className="text-red-700">Sem comentário, a alteração terá alerta vermelho no financeiro.</small>}</label>}
 <p className="text-xs text-muted-foreground">É permitido incluir vários serviços no mesmo horário, inclusive para a mesma profissional. Cada serviço mantém sua comissão base.</p>
 <Button type="button" disabled={!ready || !serviceId || !professionalId || !selectedProfessionals.some(p=>p.id===professionalId) || (options.length>0 && !variantId) || save.isPending} onClick={()=>save.mutate()}>{save.isPending?"Incluindo…":"Incluir serviço"}</Button>
 </div>}
 {(save.isError || assign.isError || remove.isError) && <p role="alert">Não foi possível salvar. Confira vínculo, disponibilidade da profissional e permissões.</p>}
 </section>;
}
