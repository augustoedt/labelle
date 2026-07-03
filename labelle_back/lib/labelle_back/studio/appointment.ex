defmodule LabelleBack.Studio.Appointment do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "appointments"
    repo LabelleBack.Repo
  end

  json_api do
    type "appointment"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :client_id,
        :client_name,
        :client_phone,
        :professional_id,
        :service_id,
        :date,
        :time,
        :duration_minutes,
        :price,
        :status,
        :payment_method,
        :notes,
        :source
      ]

      change LabelleBack.Studio.Changes.SnapshotAppointmentFields
    end

    update :update do
      require_atomic? false

      accept [
        :professional_id,
        :service_id,
        :date,
        :time,
        :duration_minutes,
        :price,
        :status,
        :payment_method,
        :notes
      ]

      change LabelleBack.Studio.Changes.SnapshotAppointmentFields
    end
  end

  policies do
    policy action_type(:create) do
      authorize_if always()
    end

    policy action_type([:read, :update]) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if expr(professional.user_id == ^actor(:id))
    end

    policy action_type(:destroy) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :client_name, :string do
      allow_nil? false
      public? true
    end

    attribute :client_phone, :string, public?: true
    attribute :professional_name, :string, public?: true
    attribute :service_name, :string, public?: true
    attribute :date, :date, allow_nil?: false, public?: true
    attribute :time, :time, allow_nil?: false, public?: true
    attribute :duration_minutes, :integer, public?: true
    attribute :price, :decimal, public?: true

    attribute :status, :atom do
      constraints one_of: [:agendado, :confirmado, :em_atendimento, :concluido, :cancelado]
      default :agendado
      public? true
    end

    attribute :payment_method, :atom do
      constraints one_of: [:pix, :dinheiro, :debito, :credito]
      public? true
    end

    attribute :notes, :string, public?: true

    attribute :source, :atom do
      constraints one_of: [:manual, :online]
      default :manual
      public? true
    end
  end

  relationships do
    belongs_to :client, LabelleBack.Studio.Client do
      allow_nil? true
      public? true
    end

    belongs_to :professional, LabelleBack.Studio.Professional do
      allow_nil? false
      public? true
    end

    belongs_to :service, LabelleBack.Studio.Service do
      allow_nil? false
      public? true
    end

    has_many :transactions, LabelleBack.Studio.Transaction, public?: true
    has_many :payments, LabelleBack.Studio.Payment, public?: true
  end
end
