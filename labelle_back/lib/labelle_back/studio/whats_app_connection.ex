defmodule LabelleBack.Studio.WhatsAppConnection do
  @moduledoc """
  Ações de administração da sessão WhatsApp da empresa (WAHA) — status,
  QR code para (re)parear e logout. Não é um resource de dados: só modela
  esse comportamento, usado pelo painel "Conexão WhatsApp" em Settings.
  Admin-only, já que expõe uma chave capaz de desconectar o número da
  empresa.
  """

  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  alias LabelleBack.Messaging.WhatsApp.Waha

  actions do
    action :status, :map do
      run fn _input, _context -> wrap(Waha.status()) end
    end

    action :qr_code, :map do
      run fn _input, _context -> wrap(Waha.qr_code()) end
    end

    action :logout do
      run fn _input, _context -> wrap(Waha.logout()) end
    end
  end

  policies do
    policy action_type(:action) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  # Traduz os erros do adapter Waha (átomos/tuplas internos) numa mensagem
  # legível, senão viram um 500 opaco no JSON:API — o `run` de uma generic
  # action só tem tratamento correto pra `{:ok, _}` / `{:error, _}`.
  defp wrap(:ok), do: :ok
  defp wrap({:ok, _} = ok), do: ok
  defp wrap({:error, reason}), do: {:error, friendly_error(reason)}

  defp friendly_error(:already_connected),
    do: "O WhatsApp da empresa já está conectado."

  defp friendly_error(:session_failed),
    do: "A sessão do WhatsApp falhou ao iniciar. Tente gerar o QR code novamente em instantes."

  defp friendly_error(:session_not_ready),
    do: "A sessão do WhatsApp está demorando pra responder. Tente novamente em instantes."

  defp friendly_error({:waha_http_error, status, _body}),
    do: "Erro ao comunicar com o servidor do WhatsApp (HTTP #{status})."

  defp friendly_error(reason), do: "Erro ao comunicar com o WhatsApp: #{inspect(reason)}"
end
