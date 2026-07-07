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
      run fn _input, _context -> Waha.status() end
    end

    action :qr_code, :map do
      run fn _input, _context -> Waha.qr_code() end
    end

    action :logout do
      run fn _input, _context -> Waha.logout() end
    end
  end

  policies do
    policy action_type(:action) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end
end
