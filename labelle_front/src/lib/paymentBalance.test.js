import test from "node:test";
import assert from "node:assert/strict";
import {paymentBalance,cashEntries} from "./paymentBalance.js";
test("balance accumulates only confirmed receipts and preserves old paid records",()=>{
 const tx={id:"t",amount:100,status:"pagamento_parcial"};
 const payments=[{transaction_id:"t",amount:40,status:"confirmado"},{transaction_id:"t",amount:60,status:"cancelado"},{transaction_id:"other",amount:500,status:"confirmado"}];
 assert.equal(paymentBalance(tx,payments).paid,40);
 assert.equal(paymentBalance(tx,payments).remaining,60);
 assert.equal(paymentBalance({...tx,status:"pago"},[]).paid,100);
 assert.equal(cashEntries([{...tx,status:"cancelado"}],payments).length,0);
});
