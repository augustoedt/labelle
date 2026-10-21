import {roundMoney} from "./commissions.js";
export function paymentBalance(transaction,payments=[]) {
 const receipts=payments.filter(p=>p.transaction_id===transaction.id && p.status==="confirmado");
 const paid=roundMoney(receipts.length ? receipts.reduce((s,p)=>s+Number(p.amount || 0),0) : transaction.status==="pago" ? Number(transaction.amount || 0) : 0);
 return {paid,remaining:roundMoney(Math.max(0,Number(transaction.amount || 0)-paid)),receipts};
}
export function cashEntries(transactions,payments=[]) {
 return transactions.filter(t=>!["cancelado","estornado"].includes(t.status)).flatMap(t=>{
  const {receipts}=paymentBalance(t,payments);
  return receipts.length ? receipts.map(p=>({...t,id:p.id,date:p.payment_date,amount:Number(p.amount || 0),transaction_id:t.id})) : t.status==="pago" ? [t] : [];
 });
}
