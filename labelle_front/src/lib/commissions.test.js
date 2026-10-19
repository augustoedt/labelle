import test from "node:test";
import assert from "node:assert/strict";
import {commissionLine,appointmentCommission,commissionAllocations,professionalCommission} from "./commissions.js";
test("commission includes principal and additional snapshots, rounded per line",()=>{assert.deepEqual(appointmentCommission({id:"a",price:100,commission_percent:40},[{appointment_id:"a",price:50,commission_percent:30},{appointment_id:"other",price:1000,commission_percent:100}]),{servicesRevenue:150,tip:0,referralBonus:0,revenue:150,amount:55,missing:false});assert.equal(commissionLine({price:33.33,commission_percent:35}).amount,11.67);});
test("missing historical rate is explicit while a recorded zero remains valid",()=>{assert.equal(commissionLine({price:100}).amount,null);assert.equal(commissionLine({price:100,commission_percent:0}).amount,0);assert.equal(appointmentCommission({id:"a",price:100},[]).missing,true);});

test("referral bonus applies to all services, with the complete tip passed on separately",()=>{
 const appointment={id:"a",price:100,commission_percent:40,tip_amount:20,referral_bonus_percent:15};
 const extras=[{appointment_id:"a",price:100,commission_percent:30}];
 assert.deepEqual(appointmentCommission(appointment,extras),{servicesRevenue:200,tip:20,referralBonus:30,revenue:220,amount:120,missing:false});
 assert.equal(appointmentCommission({...appointment,referral_bonus_percent:10},extras).amount,110);
 assert.equal(appointmentCommission({...appointment,referral_bonus_percent:0},extras).amount,90);
});

test("each professional receives her base; only the referrer own services earn referral bonus",()=>{
 const apt={id:"a",professional_id:"p",professional_name:"Principal",price:100,commission_percent:40,tip_amount:10,referral_bonus_percent:15};
 const items=[{id:"i",appointment_id:"a",professional_id:"q",professional_name:"Adicional",price:80,commission_percent:30},{id:"j",appointment_id:"a",professional_id:"p",price:50,commission_percent:20}];
 assert.equal(professionalCommission(apt,items,"p").baseCommission,50);
 assert.equal(professionalCommission(apt,items,"p").referralBonus,22.5);
 assert.equal(professionalCommission(apt,items,"p").amount,82.5);
 assert.equal(professionalCommission(apt,items,"q").baseCommission,24);
 assert.equal(professionalCommission(apt,items,"q").referralBonus,0);
 assert.equal(professionalCommission(apt,items,"q").tip,0);
 assert.equal(professionalCommission(apt,items,"q").amount,24);
 assert.equal(appointmentCommission(apt,items).amount,106.5);
 assert.equal(appointmentCommission(apt,items).referralBonus,22.5);
 assert.equal(commissionAllocations(apt,items).reduce((s,a)=>s+a.amount,0),106.5);
 assert.equal(professionalCommission({...apt,referral_bonus_percent:10},items,"p").referralBonus,15);
 assert.equal(professionalCommission({...apt,referral_bonus_percent:0},items,"p").referralBonus,0);
 assert.equal(professionalCommission({...apt,referral_bonus_percent:0},items,"q").amount,24);
});

test("a referrer executing an additional service earns bonus only on her work, never on another professional principal",()=>{
 const apt={id:"a",professional_id:"b",referral_professional_id:"a",professional_referral:false,price:200,commission_percent:30,referral_bonus_percent:15};
 const items=[{appointment_id:"a",professional_id:"a",price:100,commission_percent:40},{appointment_id:"a",professional_id:"c",price:50,commission_percent:20}];
 assert.equal(professionalCommission(apt,items,"a").amount,55);
 assert.equal(professionalCommission(apt,items,"b").amount,60);
 assert.equal(professionalCommission(apt,items,"c").amount,10);
 assert.equal(appointmentCommission(apt,items).referralBonus,15);
 assert.equal(appointmentCommission(apt,items).amount,125);
 assert.equal(professionalCommission({...apt,referral_bonus_percent:10},items,"a").amount,50);
});
