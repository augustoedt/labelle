WITH eligible AS (
 SELECT a.id,a.client_id,a.date,coalesce(a.tip_amount,0) tip,
 greatest(0,coalesce(a.price,0)+coalesce((select sum(s.price) from appointment_services s where s.appointment_id=a.id),0)) service_total
 FROM appointments a WHERE a.status='concluido' AND a.client_id IS NOT NULL
 AND a.client_id::text = $1 AND a.date <= $2::date
), receipts AS (
 SELECT e.*,coalesce((select sum(
 CASE WHEN EXISTS(select 1 from payments p where p.transaction_id=t.id)
 THEN coalesce((select sum(p.amount) from payments p where p.transaction_id=t.id and p.status='confirmado'
 and p.payment_method not in ('voucher','cortesia') and p.payment_date <= $2::date),0)
 WHEN t.status='pago' and t.payment_method not in ('voucher','cortesia','a_definir')
 and t.date <= $2::date THEN t.amount ELSE 0 END)
 FROM transactions t where t.appointment_id=e.id and t.type='entrada' and t.category='servico'
 and t.status not in ('cancelado','estornado')),0) received
 FROM eligible e
)
SELECT count(distinct date)::integer visit_count,coalesce(sum(least(service_total,greatest(0,received-tip))),0) total_spent FROM receipts
