import {useRef,useEffect} from "react";
import ProfessionalNavigator,{useProfessionalAgenda} from "@/components/agenda/ProfessionalNavigator";
import {swipeProfessionalDirection,gentlePeriodOffset} from "@/lib/professionalAgenda";
import {useQuery} from "@tanstack/react-query";
import {AppointmentServicesApi} from "@/server/api";
import {serviceScheduleEntries} from "@/lib/serviceSchedule";
import PhonePendingBadge from "@/components/ui/PhonePendingBadge";
import { hasPhone } from "@/lib/phonePending";
import { format } from "date-fns";
import { statusLabels } from "@/lib/appointmentStatus";
import { dayColumns, gridRange, minutes, clock, appointmentLanes } from "@/lib/agendaGrid";

export default function DaySchedule({date, professionals = [], appointments = [], isLoading, onAppointment, onSlot, selection: controlledSelection}) {
  const additional=useQuery({queryKey:["appointment-services"],queryFn:()=>AppointmentServicesApi.list({limit:10000})});
  const dateStr = format(date, "yyyy-MM-dd");
  const items = serviceScheduleEntries(appointments,additional.data || []).filter(a => a.date === dateStr);
  const localSelection=useProfessionalAgenda(professionals,items,date.getDay());
  const selection=controlledSelection || localSelection;
  const gesture=useRef(null),blockClickUntil=useRef(0),scrollRef=useRef(null),scrollTimer=useRef(null);
  useEffect(()=>()=>clearTimeout(scrollTimer.current),[]);
  const gentleScroll=e=>{
    const el=e.currentTarget;clearTimeout(scrollTimer.current);
    scrollTimer.current=setTimeout(()=>{
      if(gesture.current)return;
      const header=el.querySelector(".schedule-corner")?.getBoundingClientRect().height || 0;
      const anchors=[...el.querySelectorAll("[data-period-anchor]")].map(node=>node.getBoundingClientRect().top-el.getBoundingClientRect().top+el.scrollTop-header-1);
      const target=gentlePeriodOffset(el.scrollTop,anchors,el.scrollHeight-el.clientHeight);
      if(target!==null)el.scrollTo({top:target,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    },180);
  };
  const focused=selection.id!=="all";
  const columns = dayColumns(professionals, items, date.getDay());
  const unknown = items.filter(a => !columns.some(p => p.id === a.professional_id));
  const overview = unknown.length ? [...columns, {id:"unassigned", name:"Outros / sem vínculo"}] : columns;
  const displayed = focused ? selection.choices.filter(p=>p.id===selection.id) : overview;
  const pointerDown=e=>{
    if(!focused || !e.isPrimary || e.button!==0)return;
    blockClickUntil.current=0;
    gesture.current={x:e.clientX,y:e.clientY,at:performance.now(),id:e.pointerId,horizontal:false,vertical:false};
  };
  const pointerMove=e=>{
    const g=gesture.current;if(!g || g.id!==e.pointerId)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(!g.horizontal && !g.vertical && Math.max(Math.abs(dx),Math.abs(dy))>12) {
      if(Math.abs(dx)>Math.abs(dy)*1.5){g.horizontal=true;e.currentTarget.setPointerCapture(e.pointerId);}
      else g.vertical=true;
    }
    if(g.horizontal && e.cancelable)e.preventDefault();
  };
  const pointerUp=e=>{
    const g=gesture.current;gesture.current=null;if(!g || g.id!==e.pointerId)return;
    if(g.horizontal){
      blockClickUntil.current=performance.now()+450;
      const direction=swipeProfessionalDirection({dx:e.clientX-g.x,dy:e.clientY-g.y,durationMs:performance.now()-g.at});
      if(direction)selection.step(direction);
    }
  };
  const {start,end} = gridRange(columns, items);
  const slots = Array.from({length:(end-start)/30},(_,i)=>start+i*30);
  if (additional.isError)return <p role="alert">Não foi possível carregar os serviços adicionais da agenda.</p>;
  if (isLoading || additional.isPending) return <p className="schedule-message" role="status">Carregando agenda e profissionais…</p>;
  if (!selection.choices.length)return <p className="schedule-message">Nenhuma profissional disponível.</p>;
  if(!displayed.length)return <section className="professional-agenda"><ProfessionalNavigator selection={selection}/><p className="schedule-message">Nenhuma profissional com expediente neste dia.</p></section>;
  return <section className="professional-agenda">
    <ProfessionalNavigator selection={selection}/>
    {focused && displayed[0] && (displayed[0].is_active===false || (displayed[0].work_days?.length>0 && !displayed[0].work_days.map(Number).includes(date.getDay()))) && <p className="professional-day-note">Sem expediente neste dia</p>}
    <div ref={scrollRef} onScroll={gentleScroll} className={`day-schedule-scroll ${focused ? "is-focused" : ""}`} tabIndex={0} role="region" aria-label={`Agenda de ${format(date,"dd/MM/yyyy")}${focused ? ` · ${displayed[0]?.name || ""}` : ", horários por profissional"}`}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{gesture.current=null;}}
      onClickCapture={e=>{if(performance.now()<blockClickUntil.current){e.preventDefault();e.stopPropagation();}}}
      onKeyDown={e=>{if(e.target===e.currentTarget && focused && ["ArrowRight","ArrowLeft"].includes(e.key)){e.preventDefault();selection.step(e.key==="ArrowRight"?1:-1);}}}>

    <div className={`day-schedule ${focused ? "is-focused" : ""}`} style={{gridTemplateColumns:`56px repeat(${displayed.length}, minmax(${focused ? "0" : "156px"}, 1fr))`}}>
      <div className="schedule-corner">Horário</div>
      {displayed.map(p=><div className="schedule-professional" key={p.id}><span style={{background:p.color || "#a76c68"}} />{p.name}{p.is_active === false && <small>Inativa · com reserva</small>}</div>)}
      <div className="schedule-times" style={{height:slots.length*48}}>{slots.map(time=><div key={time} data-period-anchor={time===start || time===13*60 ? "true" : undefined}>{clock(time)}</div>)}</div>
      {displayed.map(p=><div key={p.id} className="schedule-column" style={{height:slots.length*48}}>
        {slots.map(time=>{
          const working = p.id !== "unassigned" && p.is_active !== false && (!p.work_days?.length || p.work_days.map(Number).includes(date.getDay())) && time >= minutes(p.work_start,540) && time < minutes(p.work_end,1080);
          const occupied = items.some(a=>a.professional_id===p.id && a.status!=="cancelado" && minutes(a.time) < time+30 && minutes(a.time)+(Number(a.duration_minutes)||30)>time);
          const props = {className:`schedule-slot ${working ? "" : "outside-work"}`,title:`${p.name} · ${clock(time)}${working ? "" : " · Fora do expediente"}`};
          return working && !occupied && onSlot ? <button key={time} {...props} aria-label={`Novo agendamento ${format(date,"dd/MM/yyyy")} às ${clock(time)} com ${p.name}`} onClick={()=>onSlot({date:dateStr,time:clock(time),professional_id:p.id})} /> : <div key={time} {...props}/>;
        })}
        {appointmentLanes(p.id === "unassigned" ? unknown : items.filter(a=>a.professional_id===p.id)).map(a=>{
          const content = <><strong>{(a.time || "").slice(0,5)} · {a.client_name}</strong><PhonePendingBadge phone={a.client_phone}/>{a.professional_referral && <span className="referral-badge">Cliente da profissional</span>}<span>{a.is_additional_service ? "Adicional · " : ""}{a.service_name}</span><small>{statusLabels[a.status] || a.status} · {a.duration_minutes || 30} min</small></>;
          const props = {className:`schedule-appointment ${!hasPhone(a.client_phone) ? "appointment-phone-missing" : ""} ${a.status === "cancelado" ? "is-cancelled" : ""}`,style:{top:(a.gridStart-start)*1.6,height:Math.max(26,(a.gridEnd-a.gridStart)*1.6-3),left:`calc(${a.lane/a.lanes*100}% + 3px)`,width:`calc(${100/a.lanes}% - 6px)`},title:`${a.client_name} · ${a.service_name} · ${a.time} · ${statusLabels[a.status] || a.status}`};
          return onAppointment ? <button key={a.id} {...props} onClick={()=>onAppointment(appointments.find(parent=>parent.id===(a.root_appointment_id || a.id)) || a)}>{content}</button> : <div key={a.id} {...props}>{content}</div>;
        })}
      </div>)}
    </div>
  </div></section>;
}
