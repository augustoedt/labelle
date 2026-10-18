export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export function commissionLine(record) {
 const price=Number(record.price || 0), raw=record.commission_percent;
 const missing=raw===null || raw===undefined || raw==="";
 const percent=missing ? null : Number(raw);
 return {price,percent,missing,amount:missing ? null : roundMoney(price*percent/100)};
}
export function appointmentCommission(appointment,items=[]) {
 const lines=[appointment,...items.filter(i=>i.appointment_id===appointment.id)].map(commissionLine);
 return {revenue:roundMoney(lines.reduce((s,l)=>s+l.price,0)),amount:roundMoney(lines.reduce((s,l)=>s+(l.amount || 0),0)),missing:lines.some(l=>l.missing)};
}
