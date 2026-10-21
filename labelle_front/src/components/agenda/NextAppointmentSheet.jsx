import {Sheet,SheetContent,SheetHeader,SheetTitle} from "@/components/ui/sheet";
import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {ServicesApi,ProfessionalsApi,ClientsApi,bookReturnAppointment} from "@/server/api";
import AppointmentForm from "@/components/agenda/AppointmentForm";
import {format,addDays} from "date-fns";
export default function NextAppointmentSheet({appointment,onClose}) {
 const qc=useQueryClient();
 const services=useQuery({queryKey:["services"],queryFn:()=>ServicesApi.list(),enabled:!!appointment});
 const professionals=useQuery({queryKey:["professionals"],queryFn:()=>ProfessionalsApi.list(),enabled:!!appointment});
 const clients=useQuery({queryKey:["clients"],queryFn:()=>ClientsApi.list({limit:10000}),enabled:!!appointment});
 const save=useMutation({mutationFn:data=>bookReturnAppointment({data}),onSuccess:()=>{for(const key of ["appointments","professional-appointments","phone-pending-appointments","clients"])qc.invalidateQueries({queryKey:[key]});onClose();}});
 if(!appointment) return null;
 if(!services.isSuccess || !professionals.isSuccess) return <Sheet open onOpenChange={open=>{if(!open)onClose();}}><SheetContent side="bottom"><SheetHeader><SheetTitle>Agendar próxima visita</SheetTitle></SheetHeader>{services.isError || professionals.isError ? <p role="alert">Não foi possível carregar os dados. <button onClick={()=>{services.refetch();professionals.refetch();}}>Tentar novamente</button></p> : <p role="status">Carregando serviços e profissionais…</p>}</SheetContent></Sheet>;
 return <AppointmentForm open={!!appointment} onClose={()=>{save.reset();onClose();}} onSubmit={data=>save.mutate(data)} services={services.data || []} professionals={professionals.data || []} clients={clients.data || []} appointment={null} initialBooking={appointment} initialDate={format(addDays(new Date(),1),"yyyy-MM-dd")} title="Agendar próxima visita" submitError={save.isError ? "Não foi possível agendar. Confira o expediente, a disponibilidade e a opção do serviço." : ""} isSaving={save.isPending}/>;
}
