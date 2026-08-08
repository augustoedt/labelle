import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { maskPhone } from "@/lib/phone";

export default function ClientForm({ open, onClose, onSubmit, client }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", birthday: "", notes: "", preferences: "",
  });

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || "", phone: client.phone || "", email: client.email || "",
        birthday: client.birthday || "", notes: client.notes || "", preferences: client.preferences || "",
      });
    } else {
      setForm({ name: "", phone: "", email: "", birthday: "", notes: "", preferences: "" });
    }
  }, [client, open]);

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading">{client ? "Editar Cliente" : "Nova Cliente"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-8">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">WhatsApp *</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Aniversário</Label>
            <Input type="date" value={form.birthday} onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Preferências</Label>
            <Input value={form.preferences} onChange={e => setForm(p => ({ ...p, preferences: e.target.value }))} placeholder="Ex: prefere corte mais curto, gosta de loiro..." />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Anotações importantes..." rows={2} />
          </div>
          <Button onClick={handleSubmit} className="w-full rounded-full h-12 font-semibold">
            {client ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}