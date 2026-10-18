import test from "node:test";
import assert from "node:assert/strict";
import {commissionLine,appointmentCommission} from "./commissions.js";
test("commission includes principal and additional snapshots, rounded per line",()=>{assert.deepEqual(appointmentCommission({id:"a",price:100,commission_percent:40},[{appointment_id:"a",price:50,commission_percent:30},{appointment_id:"other",price:1000,commission_percent:100}]),{revenue:150,amount:55,missing:false});assert.equal(commissionLine({price:33.33,commission_percent:35}).amount,11.67);});
test("missing historical rate is explicit while a recorded zero remains valid",()=>{assert.equal(commissionLine({price:100}).amount,null);assert.equal(commissionLine({price:100,commission_percent:0}).amount,0);assert.equal(appointmentCommission({id:"a",price:100},[]).missing,true);});
