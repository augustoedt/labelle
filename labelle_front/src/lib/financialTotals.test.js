import test from "node:test";
import assert from "node:assert/strict";
import {financialTotals} from "./financialTotals.js";
const start="2026-10-18",end=start;
const appointment={id:"a",status:"concluido",price:100,commission_percent:40};
const charge=amount=>({id:"t",appointment_id:"a",type:"entrada",category:"servico",status:"pago",date:start,amount});
test("price and rate changes update cash and result independently",()=>{
 assert.deepEqual(financialTotals([charge(100)],[appointment],[],start,end),{income:100,expenses:0,cash:100,commission:40,missing:false,afterCommission:60});
 const changed=financialTotals([charge(200)],[{...appointment,price:200,commission_percent:50}],[],start,end);
 assert.equal(changed.cash,200);assert.equal(changed.afterCommission,100);
 const commissionOnly=financialTotals([charge(100)],[{...appointment,commission_percent:50}],[],start,end);
 assert.equal(commissionOnly.cash,100);assert.equal(commissionOnly.afterCommission,50);
});
test("tips, referral and paid commission expenses counted once; unpaid and other dates excluded",()=>{
 const transactions=[charge(110),{type:"saida",category:"comissao",status:"pago",date:start,amount:30},{type:"saida",category:"outros",status:"pago",date:start,amount:5},{...charge(500),status:"pendente_confirmacao"},{...charge(900),date:"2026-10-19"}];
 const result=financialTotals(transactions,[{...appointment,tip_amount:10,referral_bonus_percent:15}],[],start,end);
 assert.equal(result.commission,65);assert.equal(result.cash,75);assert.equal(result.afterCommission,40);
 assert.equal(financialTotals([charge(100)],[{...appointment,commission_percent:null}],[],start,end).missing,true);
 assert.equal(financialTotals([{...charge(100),status:"cancelado"}],[appointment],[],start,end).commission,0);
});
