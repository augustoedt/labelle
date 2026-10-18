import {useState} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import {addFinancialEditComment} from "@/server/api";
import {MessageSquareWarning} from "lucide-react";
export const needsEditComment=entry=>!entry.comment?.trim();
export function MissingEditComment(){return <span className="financial-edit-warning" title="Atendimento alterado após conclusão sem comentário" aria-label="Alteração sem comentário"><MessageSquareWarning size={16}/>Alteração sem comentário</span>;}
const labels={price:"Valor",commission_percent:"Comissão (%)",service_id:"Serviço",service_variant_id:"Opção",professional_id:"Profissional",professional_referral:"Cliente da profissional",date:"Data",time:"Horário",duration_minutes:"Duração",payment_method:"Pagamento",notes:"Observações",amount:"Cobrança"};
function Entry({entry}){
 const [comment,setComment]=useState(""),qc=useQueryClient();
 const save=useMutation({mutationFn:()=>addFinancialEditComment({data:{id:entry.id,comment}}),onSuccess:()=>{qc.invalidateQueries({queryKey:["financial-edits"]});setComment("");}});
 const keys=[...new Set([...Object.keys(entry.old_values || {}),...Object.keys(entry.new_values || {})])].filter(k=>JSON.stringify(entry.old_values?.[k])!==JSON.stringify(entry.new_values?.[k]));
 return <article className={`financial-edit-entry ${needsEditComment(entry)?"financial-edit-uncommented":""}`}>
 <p>{entry.inserted_at ? new Date(entry.inserted_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}):""} · {entry.actor_email || "Sistema"} · {entry.record_kind==="item"?"Serviço adicional":"Atendimento"}</p>
 {keys.map(k=><p key={k}>{labels[k] || k}: {String(entry.old_values?.[k] ?? "—")} → {String(entry.new_values?.[k] ?? "—")}</p>)}
 {entry.comment ? <p>Comentário: {entry.comment}</p> : <><MissingEditComment/><label>Adicionar comentário<textarea aria-label="Adicionar comentário à alteração" value={comment} onChange={e=>setComment(e.target.value)}/></label><button type="button" disabled={!comment.trim() || save.isPending} onClick={()=>save.mutate()}>Salvar comentário</button>{save.isError && <p role="alert">Não foi possível salvar o comentário.</p>}</>}
 </article>;
}
export default function FinancialEditHistory({entries=[]}){return entries.length ? <details className="financial-edit-history"><summary>Histórico de alterações ({entries.length})</summary>{entries.map(entry=><Entry key={entry.id} entry={entry}/>)}</details>:null;}
