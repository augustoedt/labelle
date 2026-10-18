import test from "node:test";
import assert from "node:assert/strict";
import {commissionLine,appointmentCommission} from "./commissions.js";
test("commission includes principal and additional snapshots, rounded per line",()=>{assert.deepEqual(appointmentCommission({id:"a",price:100,commission_percent:40},[{appointment_id:"a",price:50,commission_percent:30},{appointment_id:"other",price:1000,commission_percent:100}]),{servicesRevenue:150,tip:0,referralBonus:0,revenue:150,amount:55,missing:false});assert.equal(commissionLine({price:33.33,commission_percent:35}).amount,11.67);});
test("missing historical rate is explicit while a recorded zero remains valid",()=>{assert.equal(commissionLine({price:100}).amount,null);assert.equal(commissionLine({price:100,commission_percent:0}).amount,0);assert.equal(appointmentCommission({id:"a",price:100},[]).missing,true);});

test("referral bonus applies to all services, with the complete tip passed on separately",()=>{
 const appointment={id:"a",price:100,commission_percent:40,tip_amount:20,referral_bonus_percent:15};
 const extras=[{appointment_id:"a",price:100,commission_percent:30}];
 assert.deepEqual(appointmentCommission(appointment,extras),{servicesRevenue:200,tip:20,referralBonus:30,revenue:220,amount:120,missing:false});
 assert.equal(appointmentCommission({...appointment,referral_bonus_percent:10},extras).amount,110);
 assert.equal(appointmentCommission({...appointment,referral_bonus_percent:0},extras).amount,90);
});
