export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export function commissionLine(record) {
 const price=Number(record.price || 0), raw=record.commission_percent;
 const missing=raw===null || raw===undefined || raw==="";
 const percent=missing ? null : Number(raw);
 return {price,percent,missing,amount:missing ? null : roundMoney(price*percent/100)};
}
export function commissionAllocations(appointment,items=[]) {
 const allocations={};
 const group=(id,name)=>allocations[id || "unassigned"] ||= {professional_id:id,professional_name:name || "Sem profissional",servicesRevenue:0,baseCommission:0,tip:0,referralBonus:0,amount:0,missing:false,lines:[]};
 const add=(record,id,name)=>{const line=commissionLine(record),allocation=group(id,name);allocation.servicesRevenue=roundMoney(allocation.servicesRevenue+line.price);allocation.baseCommission=roundMoney(allocation.baseCommission+(line.amount || 0));allocation.missing ||= line.missing;allocation.lines.push(record);};
 add(appointment,appointment.professional_id,appointment.professional_name);
 for(const item of items.filter(i=>i.appointment_id===appointment.id))add(item,item.professional_id || appointment.professional_id,item.professional_name || appointment.professional_name);
 const principal=group(appointment.professional_id,appointment.professional_name);
 principal.tip=Number(appointment.tip_amount || 0);
 // Somente os serviços executados por quem indicou geram bônus para ela.
 const referrer=allocations[appointment.referral_professional_id || appointment.professional_id || "unassigned"];
 if(referrer)referrer.referralBonus=roundMoney(referrer.servicesRevenue*Number(appointment.referral_bonus_percent || 0)/100);
 for(const allocation of Object.values(allocations))allocation.amount=roundMoney(allocation.baseCommission+allocation.referralBonus+allocation.tip);
 return Object.values(allocations);
}
export function professionalCommission(appointment,items,professionalId){return commissionAllocations(appointment,items).find(a=>a.professional_id===professionalId) || {professional_id:professionalId,servicesRevenue:0,baseCommission:0,tip:0,referralBonus:0,amount:0,missing:false,lines:[]};}
export function appointmentCommission(appointment,items=[]) {
 const allocations=commissionAllocations(appointment,items);
 const servicesRevenue=roundMoney(allocations.reduce((s,a)=>s+a.servicesRevenue,0));
 const tip=Number(appointment.tip_amount || 0);
 const referralBonus=roundMoney(allocations.reduce((s,a)=>s+a.referralBonus,0));
 return {servicesRevenue,tip,referralBonus,revenue:roundMoney(servicesRevenue+tip),amount:roundMoney(allocations.reduce((s,a)=>s+a.amount,0)),missing:allocations.some(a=>a.missing)};
}
