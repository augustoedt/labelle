import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SettingsApi } from "@/server/api";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";

const messageFields = [
  {
    key: "message_confirmation",
    label: "Confirmação de agendamento",
    desc: "Enviada para a cliente quando o staff/profissional confirma um agendamento.",
    placeholders: "{{cliente}} {{estudio}} {{servico}} {{profissional}} {{data}} {{hora}}",
  },
  {
    key: "message_reminder",
    label: "Lembrete manual",
    desc: "Enviada para a cliente quando alguém da equipe toca em \"Lembrete\" na agenda.",
    placeholders: "{{cliente}} {{estudio}} {{servico}} {{profissional}} {{data}} {{hora}}",
  },
  {
    key: "message_thank_you",
    label: "Agradecimento (20 dias)",
    desc: "Gerada automaticamente 20 dias após o atendimento, para envio manual em Lembretes.",
    placeholders: "{{cliente}} {{estudio}}",
  },
  {
    key: "message_reengagement",
    label: "Reativação (45 dias)",
    desc: "Gerada automaticamente a cada 45 dias sem retorno da cliente.",
    placeholders: "{{cliente}} {{estudio}}",
  },
  {
    key: "message_new_booking_notification",
    label: "Notificação de novo agendamento",
    desc: "A cliente envia esta mensagem para o WhatsApp do estúdio ao agendar pelo próprio app.",
    placeholders: "{{cliente}} {{estudio}} {{servico}} {{profissional}} {{data}} {{hora}} {{telefone_cliente}} {{endereco}}",
  },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => SettingsApi.get(),
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (attributes) => SettingsApi.update({ id: settings.id, attributes }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings"], updated);
    },
  });

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = () => {
    const { id, singleton, inserted_at, updated_at, ...attributes } = form;
    saveMutation.mutate(attributes);
  };

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-muted-foreground text-sm">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Configurações"
        subtitle="Dados do estúdio e mensagens de WhatsApp"
        action={
          <Link to="/mais"><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
        }
      />

      <div className="px-5 space-y-6">
        {/* Dados do estúdio */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Dados do estúdio</h2>

          <div>
            <Label className="text-xs">Nome do estúdio</Label>
            <Input value={form.name || ""} onChange={set("name")} placeholder="La Belle Studio" />
          </div>

          <div>
            <Label className="text-xs">Telefone / WhatsApp do estúdio</Label>
            <Input value={form.whatsapp_phone || ""} onChange={set("whatsapp_phone")} placeholder="(11) 99999-0000" />
            <p className="text-[11px] text-muted-foreground mt-1">
              É para este número que a cliente envia a notificação de novo agendamento. Salvo sempre normalizado (só números).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">CEP</Label>
              <Input value={form.zip_code || ""} onChange={set("zip_code")} placeholder="00000-000" />
            </div>
            <div>
              <Label className="text-xs">Estado (UF)</Label>
              <Input value={form.state || ""} onChange={set("state")} placeholder="SP" maxLength={2} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Rua</Label>
            <Input value={form.street || ""} onChange={set("street")} placeholder="Rua Exemplo, 123" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Bairro</Label>
              <Input value={form.neighborhood || ""} onChange={set("neighborhood")} />
            </div>
            <div>
              <Label className="text-xs">Cidade</Label>
              <Input value={form.city || ""} onChange={set("city")} />
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Mensagens de WhatsApp</h2>
          {messageFields.map(({ key, label, desc, placeholders }) => (
            <div key={key} className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
              <div>
                <Label className="text-xs font-semibold">{label}</Label>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              <Textarea
                value={form[key] || ""}
                onChange={set(key)}
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Placeholders disponíveis: {placeholders}</p>
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full rounded-xl h-12 font-semibold gap-2"
        >
          <Save className="w-4 h-4" /> {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>

        {saveMutation.isSuccess && (
          <p className="text-center text-xs text-emerald-600">Configurações salvas!</p>
        )}
        {saveMutation.isError && (
          <p className="text-center text-xs text-destructive">Não foi possível salvar. Tente novamente.</p>
        )}
      </div>
    </div>
  );
}
