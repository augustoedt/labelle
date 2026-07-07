defmodule LabelleBack.Messaging.WhatsApp.Waha do
  @moduledoc """
  Adapter para o WAHA (WhatsApp HTTP API, self-hosted) — github.com/devlikeapro/waha.

  Envia mensagens a partir do WhatsApp da empresa (sessão pareada via QR
  code), em vez de depender do celular pessoal de quem está usando o app.

  Além do behaviour `LabelleBack.Messaging.WhatsApp` (envio de mensagem),
  expõe funções de administração da sessão (`status/0`, `qr_code/0`,
  `logout/0`) usadas pelo painel de conexão em Settings — essas não fazem
  parte do behaviour porque são específicas do WAHA, não de "enviar
  WhatsApp" em geral.
  """

  @behaviour LabelleBack.Messaging.WhatsApp

  @impl true
  def configured? do
    !!config()[:base_url] && !!config()[:api_key]
  end

  @impl true
  def send_message(phone, message) do
    with {:ok, chat_id} <- chat_id(phone) do
      request(:post, "/api/sendText", json: %{chatId: chat_id, text: message, session: session()})
      |> case do
        {:ok, %{status: status, body: body}} when status in 200..299 -> {:ok, body}
        {:ok, %{status: status, body: body}} -> {:error, {:waha_http_error, status, body}}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  @doc "Status da sessão (`STOPPED | STARTING | SCAN_QR_CODE | WORKING | FAILED`) e número pareado."
  def status do
    case request(:get, "/api/sessions/#{session()}") do
      {:ok, %{status: 200, body: body}} -> {:ok, body}
      {:ok, %{status: status, body: body}} -> {:error, {:waha_http_error, status, body}}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "QR code atual (base64) para parear a sessão com um novo número."
  def qr_code do
    case request(:get, "/api/#{session()}/auth/qr", headers: [{"accept", "application/json"}]) do
      {:ok, %{status: 200, body: body}} -> {:ok, body}
      {:ok, %{status: status, body: body}} -> {:error, {:waha_http_error, status, body}}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "Desconecta o número atual (mantém a sessão configurada para um novo pareamento)."
  def logout do
    case request(:post, "/api/sessions/#{session()}/logout") do
      {:ok, %{status: status}} when status in 200..299 -> :ok
      {:ok, %{status: status, body: body}} -> {:error, {:waha_http_error, status, body}}
      {:error, reason} -> {:error, reason}
    end
  end

  defp request(method, path, opts \\ []) do
    {extra_headers, opts} = Keyword.pop(opts, :headers, [])
    headers = [{"x-api-key", config()[:api_key]} | extra_headers]

    Req.request([method: method, url: config()[:base_url] <> path, headers: headers] ++ opts)
  end

  defp chat_id(phone) when is_binary(phone) and phone != "" do
    digits = String.replace(phone, ~r/\D/, "")

    digits =
      if String.starts_with?(digits, "55") and String.length(digits) >= 12,
        do: digits,
        else: "55" <> digits

    {:ok, "#{digits}@c.us"}
  end

  defp chat_id(_), do: {:error, :missing_phone}

  defp session, do: config()[:session] || "default"

  defp config, do: Application.get_env(:labelle_back, __MODULE__, [])
end
