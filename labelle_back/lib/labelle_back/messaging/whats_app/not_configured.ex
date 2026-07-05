defmodule LabelleBack.Messaging.WhatsApp.NotConfigured do
  @moduledoc """
  Adapter padrão enquanto nenhum provedor de WhatsApp está integrado.
  Com ele ativo, os lembretes permanecem pendentes para envio manual.
  """

  @behaviour LabelleBack.Messaging.WhatsApp

  @impl true
  def configured?, do: false

  @impl true
  def send_message(_phone, _message), do: {:error, :whatsapp_adapter_not_configured}
end
