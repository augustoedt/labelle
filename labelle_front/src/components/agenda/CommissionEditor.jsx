import {useState} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import {editRecordedService} from "@/server/api";
import {useUser} from "@/lib/auth";
import {commissionLine,roundMoney} from "@/lib/commissions";
import {formatBRL} from "@/lib/format";
export default function CommissionEditor({record,kind="appointment",completed=false}) {
 const user=useUser(),qc=useQueryClient(),line=commissionLine(record);
 const [editing,setEditing]=useState(false),[percent,setPercent]=useState(""),[price,setPrice]=useState(""),[comment,setComment]=useState("");
 const validPercent=(percent==="" && line.missing) || (percent!=="" && Number.isFinite(Number(percent)) && Number(percent)>=0 && Number(percent)<=100);
 const valid=validPercent && price!=="" && Number.isFinite(Number(price)) && Number(price)>=0;
 const historical=completed || record.status==="concluido";
 const save=useMutation({mutationFn:()=>editRecordedService({data:{id:record.id,kind,price:Number(price),...(percent!==""?{percent:Number(percent)}:{}),comment}}),onSuccess:()=>{for(const key of ["appointments","professional-appointments","appointment-services","commission-appointments","commission-items","transactions","financial-edits"])qc.invalidateQueries({queryKey:[key]});setEditing(false);}});
 if(user?.role!=="admin")return null;
 return <div className="commission-editor" onClick={e=>e.stopPropagation()}>
 <span>{line.missing ? "Comissão não registrada" : `Comissão: ${line.percent}% · ${formatBRL(line.amount,{decimals:2})}`}</span>
 {!editing ? <button type="button" onClick={()=>{setPercent(line.percent===null ? "" : String(line.percent));setPrice(String(line.price));setComment("");setEditing(true);save.reset();}}>Editar valor / comissão</button> : <div className="commission-edit-fields">
 <label>Valor do serviço (R$)<input aria-label="Valor do serviço (R$)" type="number" step="0.01" min="0" value={price} onChange={e=>setPrice(e.target.value)}/></label>
 <label>Comissão (%)<input aria-label="Comissão (%)" type="number" step="0.000001" min="0" max="100" value={percent} onChange={e=>setPercent(e.target.value)}/></label>
 <label>Comissão (R$)<input aria-label="Comissão (R$)" type="number" step="0.01" min="0" max={Number(price)} value={valid && percent!=="" ? roundMoney(Number(price)*Number(percent)/100) : ""} disabled={Number(price)<=0} onChange={e=>setPercent(e.target.value==="" ? "" : String(Number((Number(e.target.value)/Number(price)*100).toFixed(6))))}/></label>
 <label>Comentário da alteração<textarea aria-label="Comentário da alteração" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Explique o motivo da alteração" /></label>
 {historical && !comment.trim() && <p role="status" className="text-red-700">Sem comentário: esta alteração ficará com alerta vermelho no financeiro.</p>}
 <button disabled={!valid || save.isPending} onClick={()=>save.mutate()}>{save.isPending ? "Salvando…" : "Salvar alteração"}</button><button type="button" onClick={()=>setEditing(false)}>Voltar</button>
 {save.isError && <p role="alert">Não foi possível salvar a alteração.</p>}
 </div>}
 </div>;
}
