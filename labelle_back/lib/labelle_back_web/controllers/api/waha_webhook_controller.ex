defmodule LabelleBackWeb.Api.WahaWebhookController do
  @moduledoc """
  Recebe eventos do WAHA (mensagem enviada/recebida, status de entrega
  `message.ack`, status da sessão) — configurado via `Waha.configure_webhook/0`
  apontando pra cá pela rede privada do Railway. Só loga por enquanto; é o
  jeito de ver se uma mensagem que a API aceitou (retornou sucesso) realmente
  chegou no destinatário (`ackName`: PENDING -> SERVER -> DEVICE -> READ, ou
  ERROR).

  Alcançável apenas pela rede interna do Railway (WAHA não expõe domínio
  público), então sem autenticação própria.
  """

  use LabelleBackWeb, :controller

  require Logger

  def create(conn, %{"event" => event} = params) do
    Logger.info("waha webhook: #{event} #{inspect(Map.get(params, "payload"))}")
    send_resp(conn, 200, "")
  end

  def create(conn, params) do
    Logger.info("waha webhook: evento sem campo `event` - #{inspect(params)}")
    send_resp(conn, 200, "")
  end
end
