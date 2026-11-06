import {useEffect,useRef,useState} from "react";
import {agendaProfessionals,nextProfessionalId} from "@/lib/professionalAgenda";

export function useProfessionalAgenda(professionals,entries,weekday) {
  const [narrow,setNarrow]=useState(false);
  const [choice,setChoice]=useState(null);
  useEffect(()=>{
    const media=window.matchMedia("(max-width: 767px)");
    const update=()=>setNarrow(media.matches);
    update();media.addEventListener("change",update);
    return ()=>media.removeEventListener("change",update);
  },[]);
  const choices=agendaProfessionals(professionals,entries,weekday);
  const id=choice === "all" || choices.some(p=>p.id===choice) ? choice : narrow && choices.length ? choices[0].id : "all";
  const select=id=>setChoice(id);
  const step=direction=>{const next=nextProfessionalId(choices,id,direction);if(next)select(next);};
  return {choices,id,select,step};
}

export default function ProfessionalNavigator({selection}) {
  const {choices,id,select}=selection;
  const tabsRef=useRef(null);
  const index=choices.findIndex(p=>p.id===id);
  useEffect(()=>{
    const row=tabsRef.current;if(!row)return;
    const center=()=>{
      const selected=row.querySelector('[aria-pressed="true"]');if(!selected)return;
      const target=selected.getBoundingClientRect().left-row.getBoundingClientRect().left+row.scrollLeft-row.clientWidth/2+selected.clientWidth/2;
      row.scrollTo({left:Math.max(0,target),behavior:"auto"});
    };
    center();const observer=new ResizeObserver(center);observer.observe(row);
    return ()=>observer.disconnect();
  },[id,choices.length]);
  return <div className="professional-navigator">
    <span className="professional-label">Profissional</span>
    <div ref={tabsRef} className="professional-tabs" role="group" aria-label="Selecionar profissional da agenda">
      <button type="button" className={`professional-tab ${id==="all" ? "is-selected" : ""}`} aria-pressed={id==="all"} aria-label="Todas as profissionais" onClick={()=>select("all")}>Todas</button>
      {choices.map(p=><button key={p.id} type="button" className={`professional-tab ${id===p.id ? "is-selected" : ""}`} aria-pressed={id===p.id} title={p.name} onClick={()=>select(p.id)}>
        <span className="professional-color" style={{background:p.color || "#a76c68"}} aria-hidden="true"/>
        <span className="professional-tab-name">{p.name}</span>
        {p.is_active===false && p.id!=="unassigned" && <small>Inativa</small>}
      </button>)}
    </div>
    <span className="professional-position" role="status">{index>=0 ? `${index+1} de ${choices.length}` : `${choices.length} profissionais`}</span>
  </div>;
}
