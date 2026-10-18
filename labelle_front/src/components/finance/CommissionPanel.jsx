import FinancialEditHistory,{needsEditComment,MissingEditComment} from "@/components/finance/FinancialEditHistory";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {AppointmentsApi,AppointmentServicesApi,listFinancialEdits} from "@/server/api";
import {useUser} from "@/lib/auth";
import {appointmentCommission,roundMoney} from "@/lib/commissions";
import {formatBRL} from "@/lib/format";
import CommissionEditor from "@/components/agenda/CommissionEditor";
import {format} from "date-fns";
export default function CommissionPanel({start,end}) {
 const user=useUser(),admin=user?.role==="admin";
 const [month,setMonth]=useState(format(new Date(),"yyyy-MM"));
 const appts=useQuery({queryKey:["commission-appointments"],queryFn:()=>AppointmentsApi.list({limit:10000,sort:"-date"}),enabled:admin});
 const items=useQuery({queryKey:["commission-items"],queryFn:()=>AppointmentServicesApi.list({limit:10000}),enabled:admin});
 const edits=useQuery({queryKey:["financial-edits"],queryFn:()=>listFinancialEdits({data:{limit:10000,sort:"-inserted_at"}}),enabled:admin});
 if(!admin)return null;
 if(appts.isPending || items.isPending || edits.isPending)return <section className="commission-panel" role="status">Carregando comissões…</section>;
 if(appts.isError || items.isError || edits.isError)return <section className="commission-panel" role="alert">Não foi possível carregar comissões. <button onClick={()=>{appts.refetch();items.refetch();edits.refetch();}}>Tentar novamente</button></section>;
 const records=(appts.data || []).filter(a=>a.status==="concluido" && (start ? a.date>=start && a.date<=end : a.date?.startsWith(month)));
 const history=id=>(edits.data || []).filter(e=>e.appointment_id===id);
 const noComment=id=>history(id).some(needsEditComment);
 const rows=records.map(a=>({...a,summary:appointmentCommission(a,items.data || [])}));
 const total=roundMoney(rows.reduce((s,a)=>s+a.summary.amount,0)),missing=rows.filter(a=>a.summary.missing).length;
 const byProfessional=rows.reduce((acc,a)=>{const key=a.professional_id || a.professional_name;acc[key] ||= {name:a.professional_name || "Sem profissional",amount:0};acc[key].amount=roundMoney(acc[key].amount+a.summary.amount);return acc;},{});
 return <section className="commission-panel" aria-label="Comissões dos atendimentos"><div className="commission-heading"><div><h2>Comissões dos atendimentos</h2><strong>{formatBRL(total,{decimals:2})}</strong><p>Comissões registradas de atendimentos concluídos. Não representam pagamentos já realizados.</p></div>{!start && <label>Mês<input aria-label="Mês das comissões" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>}</div>
 {missing>0 && <p className="commission-warning">{missing} atendimento(s) com percentual não registrado. Defina a comissão abaixo; valores ausentes não foram estimados pelo catálogo atual.</p>}
 <div className="commission-professionals">{Object.entries(byProfessional).map(([id,p])=><span key={id}>{p.name}: <strong>{formatBRL(p.amount,{decimals:2})}</strong></span>)}</div>
 <div className="commission-history">{!rows.length && <p>Nenhum atendimento concluído neste período.</p>}{rows.map(a=><details key={a.id} className={noComment(a.id)?"financial-edit-uncommented":""}><summary>{noComment(a.id) && <MissingEditComment/>}{a.professional_referral && <span className="referral-badge">Cliente da profissional</span>}{a.date?.split("-").reverse().join("/")} · {a.client_name} · {a.professional_name}<strong>{formatBRL(a.summary.amount,{decimals:2})}{a.summary.missing ? " + pendência" : ""}</strong></summary><div><p>{a.service_name} · base {formatBRL(a.price,{decimals:2})}</p><CommissionEditor record={a} completed/><p>Indicação ({Number(a.referral_bonus_percent || 0)} p.p.): {formatBRL(a.summary.referralBonus,{decimals:2})} · Gorjeta integral: {formatBRL(a.summary.tip,{decimals:2})}</p>{(items.data || []).filter(i=>i.appointment_id===a.id).map(i=><div key={i.id}><p>{i.service_name} · adicional {formatBRL(i.price,{decimals:2})}</p><CommissionEditor record={i} kind="item" completed/></div>)}<FinancialEditHistory entries={history(a.id)}/></div></details>)}</div>
 </section>;
}
