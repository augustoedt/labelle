import {appointmentCommission,roundMoney} from "./commissions.js";
import {cashEntries,paymentBalance} from "./paymentBalance.js";
export function financialTotals(transactions,appointments,items,start,end,payments=[]){
 const received=cashEntries(transactions,payments).filter(t=>t.date>=start && t.date<=end);
 const income=roundMoney(received.filter(t=>t.type==="entrada").reduce((s,t)=>s+Number(t.amount || 0),0));
 const expenses=roundMoney(received.filter(t=>t.type==="saida").reduce((s,t)=>s+Number(t.amount || 0),0));
 let commission=0,missing=false;
 for(const a of appointments.filter(a=>a.status==="concluido")) {
  const t=transactions.find(t=>t.appointment_id===a.id && t.type==="entrada" && t.category==="servico" && !["cancelado","estornado"].includes(t.status));
  if(!t)continue;
  const {receipts}=paymentBalance(t,payments);
  const inPeriod=receipts.filter(p=>p.payment_date>=start && p.payment_date<=end).reduce((s,p)=>s+Number(p.amount || 0),0);
  const ratio=receipts.length ? Math.min(1,inPeriod/Number(t.amount || 1)) : t.status==="pago" && t.date>=start && t.date<=end ? 1 : 0;
  if(ratio>0){const c=appointmentCommission(a,items);commission+=c.amount*ratio;missing ||= c.missing;}
 }
 commission=roundMoney(commission);
 const commissionExpenses=roundMoney(received.filter(t=>t.type==="saida" && t.category==="comissao").reduce((s,t)=>s+Number(t.amount || 0),0));
 const cash=roundMoney(income-expenses);
 return {income,expenses,cash,commission,missing,afterCommission:roundMoney(cash-Math.max(0,commission-commissionExpenses))};
}
