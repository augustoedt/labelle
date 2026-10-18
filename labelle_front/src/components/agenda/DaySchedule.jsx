import { format } from "date-fns";
import { statusLabels } from "@/lib/appointmentStatus";
import { dayColumns, gridRange, minutes, clock, appointmentLanes } from "@/lib/agendaGrid";

export default function DaySchedule({date, professionals = [], appointments = [], isLoading, onAppointment}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const items = appointments.filter(a => a.date === dateStr);
  const columns = dayColumns(professionals, items, date.getDay());
  const unknown = items.filter(a => !columns.some(p => p.id === a.professional_id));
  const displayed = unknown.length ? [...columns, {id:"unassigned", name:"Outros / sem vínculo"}] : columns;
  const {start,end} = gridRange(columns, items);
  const slots = Array.from({length:(end-start)/30},(_,i)=>start+i*30);
  if (isLoading) return <p className="schedule-message" role="status">Carregando agenda e profissionais…</p>;
  if (!displayed.length) return <p className="schedule-message">Nenhuma profissional com expediente neste dia. Selecione outra data.</p>;
  return <div className="day-schedule-scroll" tabIndex={0} role="region" aria-label={`Agenda de ${format(date,"dd/MM/yyyy")}, horários por profissional`}>
    <div className="day-schedule" style={{gridTemplateColumns:`56px repeat(${displayed.length}, minmax(156px, 1fr))`}}>
      <div className="schedule-corner">Horário</div>
      {displayed.map(p=><div className="schedule-professional" key={p.id}><span style={{background:p.color || "#a76c68"}} />{p.name}{p.is_active === false && <small>Inativa · com reserva</small>}</div>)}
      <div className="schedule-times" style={{height:slots.length*48}}>{slots.map(time=><div key={time}>{clock(time)}</div>)}</div>
      {displayed.map(p=><div key={p.id} className="schedule-column" style={{height:slots.length*48}}>
        {slots.map(time=>{
          const working = p.id !== "unassigned" && p.is_active !== false && (!p.work_days?.length || p.work_days.map(Number).includes(date.getDay())) && time >= minutes(p.work_start,540) && time < minutes(p.work_end,1080);
          return <div key={time} className={`schedule-slot ${working ? "" : "outside-work"}`} title={`${p.name} · ${clock(time)}${working ? "" : " · Fora do expediente"}`} />;
        })}
        {appointmentLanes(p.id === "unassigned" ? unknown : items.filter(a=>a.professional_id===p.id)).map(a=>{
          const content = <><strong>{(a.time || "").slice(0,5)} · {a.client_name}</strong><span>{a.service_name}</span><small>{statusLabels[a.status] || a.status} · {a.duration_minutes || 30} min</small></>;
          const props = {className:`schedule-appointment ${a.status === "cancelado" ? "is-cancelled" : ""}`,style:{top:(a.gridStart-start)*1.6,height:Math.max(26,(a.gridEnd-a.gridStart)*1.6-3),left:`calc(${a.lane/a.lanes*100}% + 3px)`,width:`calc(${100/a.lanes}% - 6px)`},title:`${a.client_name} · ${a.service_name} · ${a.time} · ${statusLabels[a.status] || a.status}`};
          return onAppointment ? <button key={a.id} {...props} onClick={()=>onAppointment(a)}>{content}</button> : <div key={a.id} {...props}>{content}</div>;
        })}
      </div>)}
    </div>
  </div>;
}
