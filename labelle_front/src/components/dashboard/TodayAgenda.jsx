import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProfessionalsApi } from "@/server/api";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DaySchedule from "@/components/agenda/DaySchedule";

export default function TodayAgenda({ appointments = [], isLoading }) {
  const [date,setDate] = useState(new Date());
  const query = useQuery({queryKey:["professionals"],queryFn:()=>ProfessionalsApi.list()});
  return <div className="today-agenda">
    <div className="schedule-date-nav">
      <button aria-label="Dia anterior" onClick={()=>setDate(d=>addDays(d,-1))}><ChevronLeft size={18}/></button>
      <label><span>{format(date,"EEEE, d 'de' MMMM",{locale:ptBR})}</span><input aria-label="Data da agenda" type="date" value={format(date,"yyyy-MM-dd")} onChange={e=>{if(e.target.value) setDate(new Date(e.target.value+"T12:00:00"));}} /></label>
      <button aria-label="Próximo dia" onClick={()=>setDate(d=>addDays(d,1))}><ChevronRight size={18}/></button>
      <button onClick={()=>setDate(new Date())}>Hoje</button>
    </div>
    {query.isError ? <p role="alert">Não foi possível carregar as profissionais.</p> : <DaySchedule date={date} professionals={query.data || []} appointments={appointments} isLoading={isLoading || query.isPending} />}
    <p className="schedule-note">Áreas sombreadas indicam horários fora do expediente cadastrado.</p>
  </div>;
}
