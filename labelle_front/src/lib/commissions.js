export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export function commissionLine(record) {
 const price=Number(record.price || 0), raw=record.commission_percent;
 const missing=raw===null || raw===undefined || raw==="";
 const percent=missing ? null : Number(raw);
 return {price,percent,missing,amount:missing ? null : roundMoney(price*percent/100)};
}
export function appointmentCommission(appointment,items=[]) {
 const lines=[appointment,...items.filter(i=>i.appointment_id===appointment.id)].map(commissionLine);
 const servicesRevenue=roundMoney(lines.reduce((s,l)=>s+l.price,0));
 const tip=Number(appointment.tip_amount || 0);
 const referralBonus=roundMoney(servicesRevenue*Number(appointment.referral_bonus_percent || 0)/100);
 return {servicesRevenue,tip,referralBonus,revenue:roundMoney(servicesRevenue+tip),amount:roundMoney(lines.reduce((s,l)=>s+(l.amount || 0),0)+referralBonus+tip),missing:lines.some(l=>l.missing)};
}
