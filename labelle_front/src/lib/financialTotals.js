import {appointmentCommission,roundMoney} from "./commissions.js";
export function financialTotals(transactions,appointments,items,start,end){
 const paid=transactions.filter(t=>t.status==="pago" && t.date>=start && t.date<=end);
 const income=roundMoney(paid.filter(t=>t.type==="entrada").reduce((s,t)=>s+Number(t.amount || 0),0));
 const expenses=roundMoney(paid.filter(t=>t.type==="saida").reduce((s,t)=>s+Number(t.amount || 0),0));
 const paidAppointmentIds=new Set(paid.filter(t=>t.type==="entrada" && t.category==="servico" && t.appointment_id).map(t=>t.appointment_id));
 const completed=appointments.filter(a=>a.status==="concluido" && paidAppointmentIds.has(a.id));
 const commission=roundMoney(completed.reduce((s,a)=>s+appointmentCommission(a,items).amount,0));
 const missing=completed.some(a=>appointmentCommission(a,items).missing);
 const commissionExpenses=roundMoney(paid.filter(t=>t.type==="saida" && t.category==="comissao").reduce((s,t)=>s+Number(t.amount || 0),0));
 const cash=roundMoney(income-expenses);
 return {income,expenses,cash,commission,missing,afterCommission:roundMoney(cash-Math.max(0,commission-commissionExpenses))};
}
