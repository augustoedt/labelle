import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SettingsApi, WhatsAppConnectionApi } from "@/server/api";
import { ArrowLeft, Save, Wifi, WifiOff, RefreshCw, QrCode, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";

// Status possíveis retornados pela sessão do WAHA (ver
// LabelleBack.Messaging.WhatsApp.Waha.status/0): STOPPED | STARTING |
// SCAN_QR_CODE | WORKING | FAILED.
function connectionStatusLabel(status) {
  switch (status) {
    case "WORKING":
      return { text: "Conectado", tone: "text-emerald-600" };
    case "SCAN_QR_CODE":
      return { text: "Aguardando leitura do QR code", tone: "text-amber-600" };
    case "STARTING":
      return { text: "Iniciando conexão...", tone: "text-amber-600" };
    case undefined:
    case null:
      return { text: "Verificando...", tone: "text-muted-foreground" };
    default:
      return { text: "Desconectado", tone: "text-destructive" };
  }
}

// O WAHA retorna o QR code em base64 num de dois formatos (Base64File ou
// QRCodeValue) dependendo da versão/config — tenta os dois nomes de campo.
function qrImageSrc(qrResult) {
  if (!qrResult) return null;
  const base64 = qrResult.data || qrResult.value;
  if (!base64) return null;
  return base64.startsWith("data:") ? base64 : `data:${qrResult.mimetype || "image/png"};base64,${base64}`;
}

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

  const {
    data: connectionStatus,
    refetch: refetchConnectionStatus,
    isFetching: isCheckingConnection,
  } = useQuery({
    queryKey: ["whatsapp-connection-status"],
    queryFn: () => WhatsAppConnectionApi.status(),
  });

  const qrMutation = useMutation({
    mutationFn: () => WhatsAppConnectionApi.qrCode(),
  });

  const logoutMutation = useMutation({
    mutationFn: () => WhatsAppConnectionApi.logout(),
    onSuccess: () => {
      qrMutation.reset();
      refetchConnectionStatus();
    },
  });

  const handleLogoutWhatsApp = () => {
    if (
      window.confirm(
        "Desparear o WhatsApp da empresa? Será preciso escanear um QR code novo (com o celular da empresa, ou de um número diferente) para reconectar."
      )
    ) {
      logoutMutation.mutate();
    }
  };

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
            <p className="text-xs text-muted-foreground mt-1">
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

        {/* Conexão WhatsApp da empresa */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Conexão WhatsApp da empresa</h2>
          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {connectionStatus?.status === "WORKING" ? (
                  <Wifi className="w-4 h-4 text-emerald-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={`text-sm font-medium ${connectionStatusLabel(connectionStatus?.status).tone}`}>
                  {connectionStatusLabel(connectionStatus?.status).text}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs rounded-lg gap-1"
                disabled={isCheckingConnection}
                onClick={() => refetchConnectionStatus()}
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingConnection ? "animate-spin" : ""}`} /> Verificar
              </Button>
            </div>

            {connectionStatus?.me && (
              <p className="text-xs text-muted-foreground">
                Número pareado: {connectionStatus.me.id || connectionStatus.me.pushName}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg gap-1.5 flex-1"
                disabled={qrMutation.isPending}
                onClick={() => qrMutation.mutate()}
              >
                <QrCode className="w-3.5 h-3.5" /> {qrMutation.isPending ? "Gerando..." : "Gerar QR code"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg gap-1.5 text-destructive"
                disabled={logoutMutation.isPending}
                onClick={handleLogoutWhatsApp}
              >
                <LogOut className="w-3.5 h-3.5" /> Desparear
              </Button>
            </div>

            {qrMutation.isError && (
              <p className="text-xs text-destructive">Não foi possível gerar o QR code. Tente novamente.</p>
            )}
            {qrImageSrc(qrMutation.data) && (
              <div className="flex flex-col items-center gap-2 pt-1">
                <img src={qrImageSrc(qrMutation.data)} alt="QR code para parear o WhatsApp" className="w-48 h-48 rounded-xl border border-border/50" />
                <p className="text-xs text-muted-foreground text-center">
                  Escaneie com o WhatsApp do celular da empresa (Aparelhos conectados → Conectar um aparelho).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mensagens */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Mensagens de WhatsApp</h2>
          {messageFields.map(({ key, label, desc, placeholders }) => (
            <div key={key} className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
              <div>
                <Label className="text-xs font-semibold">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Textarea
                value={form[key] || ""}
                onChange={set(key)}
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">Placeholders disponíveis: {placeholders}</p>
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
          <p className="text-center text-xs text-emerald-600">Configurações salvas</p>
        )}
        {saveMutation.isError && (
          <p className="text-center text-xs text-destructive">Não foi possível salvar. Tente novamente.</p>
        )}
      </div>
    </div>
  );
}
