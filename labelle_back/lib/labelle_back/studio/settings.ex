defmodule LabelleBack.Studio.Settings do
  @moduledoc """
  Configuração do estúdio: dados de contato/endereço e os templates das
  mensagens de WhatsApp. Singleton — existe exatamente uma linha, garantida
  pelo campo `singleton` (sempre `true`) com identidade única.

  Os templates de mensagem aceitam os placeholders `{{cliente}}`,
  `{{servico}}`, `{{profissional}}`, `{{data}}`, `{{hora}}`, `{{estudio}}`,
  `{{endereco}}` e `{{telefone_cliente}}` (nem todo template usa todos —
  ver front, tela de Configurações, para a legenda por template).
  """

  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "studio_settings"
    repo LabelleBack.Repo
  end

  json_api do
    type "studio_settings"
  end

  actions do
    read :read do
      primary? true
      get? true
    end

    create :create do
      accept [
        :name,
        :whatsapp_phone,
        :zip_code,
        :street,
        :neighborhood,
        :city,
        :state,
        :message_confirmation,
        :message_reminder,
        :message_thank_you,
        :message_reengagement,
        :message_new_booking_notification
      ]

      change LabelleBack.Studio.Changes.NormalizeWhatsappPhone
    end

    update :update do
      require_atomic? false

      accept [
        :name,
        :whatsapp_phone,
        :zip_code,
        :street,
        :neighborhood,
        :city,
        :state,
        :message_confirmation,
        :message_reminder,
        :message_thank_you,
        :message_reengagement,
        :message_new_booking_notification
      ]

      change LabelleBack.Studio.Changes.NormalizeWhatsappPhone
    end
  end

  policies do
    # Profissionais precisam ler os templates/nome do estúdio para montar as
    # mensagens de confirmação/lembrete na própria agenda; edição continua
    # restrita ao staff.
    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if actor_attribute_equals(:role, :profissional)
    end

    policy action_type(:update) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :singleton, :boolean do
      default true
      allow_nil? false
      writable? false
      public? false
    end

    attribute :name, :string do
      default "La Belle Studio"
      allow_nil? false
      public? true
    end

    attribute :whatsapp_phone, :string, allow_nil?: false, public?: true

    attribute :zip_code, :string, public?: true
    attribute :street, :string, public?: true
    attribute :neighborhood, :string, public?: true
    attribute :city, :string, public?: true
    attribute :state, :string, public?: true

    attribute :message_confirmation, :string, allow_nil?: false, public?: true
    attribute :message_reminder, :string, allow_nil?: false, public?: true
    attribute :message_thank_you, :string, allow_nil?: false, public?: true
    attribute :message_reengagement, :string, allow_nil?: false, public?: true
    attribute :message_new_booking_notification, :string, allow_nil?: false, public?: true

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  identities do
    identity :singleton, [:singleton]
  end

  @doc "Endereço formatado numa linha só, pra usar no `{{endereco}}` dos templates."
  def format_address(settings) do
    [
      settings.street,
      settings.neighborhood,
      settings.city && settings.state && "#{settings.city} - #{settings.state}",
      settings.zip_code && "CEP #{settings.zip_code}"
    ]
    |> Enum.reject(&(&1 in [nil, ""]))
    |> Enum.join(", ")
  end
end
