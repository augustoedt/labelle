WITH eligible AS (
 SELECT a.id,a.client_id,a.date,coalesce(a.tip_amount,0) tip,
 greatest(0,coalesce(a.price,0)+coalesce((select sum(s.price) from appointment_services s where s.appointment_id=a.id),0)) service_total
 FROM appointments a WHERE a.status='concluido' AND a.client_id IS NOT NULL
 AND a.date BETWEEN DATE '2026-10-01' AND least(DATE '2026-12-31',$1::date)
), receipts AS (
 SELECT e.*,coalesce((select sum(
 CASE WHEN EXISTS(select 1 from payments p where p.transaction_id=t.id)
 THEN coalesce((select sum(p.amount) from payments p where p.transaction_id=t.id and p.status='confirmado'
 and p.payment_method not in ('voucher','cortesia') and p.payment_date <= least(DATE '2026-12-31',$1::date)),0)
 WHEN t.status='pago' and t.payment_method not in ('voucher','cortesia','a_definir')
 and t.date <= least(DATE '2026-12-31',$1::date) THEN t.amount ELSE 0 END)
 FROM transactions t where t.appointment_id=e.id and t.type='entrada' and t.category='servico'
 and t.status not in ('cancelado','estornado')),0) received
 FROM eligible e
), visits AS (
 SELECT client_id,count(distinct date)::integer days FROM eligible GROUP BY client_id
), months AS (
 SELECT client_id,count(*)::integer * 100 bonus FROM (
 SELECT client_id,date_trunc('month',date) FROM eligible GROUP BY client_id,date_trunc('month',date) HAVING count(distinct date)>=3
 ) m GROUP BY client_id
), spent AS (
 SELECT client_id,sum(least(service_total,greatest(0,received-tip))) paid FROM receipts GROUP BY client_id
)
SELECT c.id::text,c.loyalty_points old_points,coalesce(s.paid,0)::text paid,
 coalesce(v.days,0) visit_days,coalesce(m.bonus,0) monthly_bonus,
 (floor(coalesce(s.paid,0))+coalesce(v.days,0)*50+coalesce(m.bonus,0))::integer points
FROM clients c LEFT JOIN spent s ON s.client_id=c.id LEFT JOIN visits v ON v.client_id=c.id LEFT JOIN months m ON m.client_id=c.id
ORDER BY c.id
