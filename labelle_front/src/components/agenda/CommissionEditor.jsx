import {useState} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import {setRecordedCommission} from "@/server/api";
import {useUser} from "@/lib/auth";
import {commissionLine,roundMoney} from "@/lib/commissions";
import {formatBRL} from "@/lib/format";
export default function CommissionEditor({record,kind="appointment"}) {
 const user=useUser(),qc=useQueryClient(),line=commissionLine(record);
 const [editing,setEditing]=useState(false),[percent,setPercent]=useState("");
 const valid=percent!=="" && Number.isFinite(Number(percent)) && Number(percent)>=0 && Number(percent)<=100;
 const save=useMutation({mutationFn:()=>setRecordedCommission({data:{id:record.id,kind,percent:Number(percent)}}),onSuccess:()=>{for(const key of ["appointments","professional-appointments","appointment-services","commission-appointments","commission-items"])qc.invalidateQueries({queryKey:[key]});setEditing(false);}});
 if(user?.role!=="admin")return null;
 return <div className="commission-editor" onClick={e=>e.stopPropagation()}>
 <span>{line.missing ? "Comissão não registrada" : `Comissão: ${line.percent}% · ${formatBRL(line.amount,{decimals:2})}`}</span>
 {!editing ? <button type="button" onClick={()=>{setPercent(line.percent===null ? "" : String(line.percent));setEditing(true);save.reset();}}>Editar comissão</button> : <div className="commission-edit-fields">
 <label>Comissão (%)<input aria-label="Comissão (%)" type="number" step="0.000001" min="0" max="100" value={percent} onChange={e=>setPercent(e.target.value)}/></label>
 <label>Comissão (R$)<input aria-label="Comissão (R$)" type="number" step="0.01" min="0" max={line.price} value={valid ? roundMoney(line.price*Number(percent)/100) : ""} disabled={line.price<=0} onChange={e=>setPercent(e.target.value==="" ? "" : String(Number((Number(e.target.value)/line.price*100).toFixed(6))))}/></label>
 <button disabled={!valid || save.isPending} onClick={()=>save.mutate()}>{save.isPending ? "Salvando…" : "Salvar comissão"}</button><button type="button" onClick={()=>setEditing(false)}>Voltar</button>
 {save.isError && <p role="alert">Não foi possível salvar a comissão.</p>}
 </div>}
 </div>;
}
