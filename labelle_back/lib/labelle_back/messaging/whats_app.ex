defmodule LabelleBack.Messaging.WhatsApp do
  @moduledoc """
  Ponto único de envio de WhatsApp do sistema.

  Nenhum provedor está integrado ainda: o adapter padrão é
  `LabelleBack.Messaging.WhatsApp.NotConfigured`, e os lembretes ficam com
  status `:pendente` para envio manual pela equipe (link wa.me no front).

  Para integrar um provedor (Meta Cloud API, Twilio, Evolution API...), crie
  um módulo implementando este behaviour e aponte a config:

      config :labelle_back, :whatsapp_adapter, MeuApp.Messaging.WhatsApp.MeuProvedor

  A partir daí o job diário `deliver_pending` do `ClientReminder` passa a
  enviar os lembretes automaticamente.
  """

  @doc "Se o adapter está pronto para enviar mensagens de verdade."
  @callback configured?() :: boolean()

  @doc "Envia `message` para `phone` (dígitos, com DDI 55). Retorna id externo no sucesso."
  @callback send_message(phone :: String.t(), message :: String.t()) ::
              {:ok, term()} | {:error, term()}

  def adapter do
    Application.get_env(:labelle_back, :whatsapp_adapter, __MODULE__.NotConfigured)
  end

  def configured?, do: adapter().configured?()

  def send_message(phone, message), do: adapter().send_message(phone, message)
end
