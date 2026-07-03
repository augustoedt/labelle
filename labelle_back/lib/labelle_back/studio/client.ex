defmodule LabelleBack.Studio.Client do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "clients"
    repo LabelleBack.Repo
  end

  json_api do
    type "client"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :name,
        :phone,
        :email,
        :birthday,
        :notes,
        :preferences,
        :avatar_url,
        :is_active,
        :source,
        :first_appointment_date,
        :last_appointment_date
      ]

      change LabelleBack.Studio.Changes.NormalizePhone
    end

    update :update do
      require_atomic? false

      accept [
        :name,
        :phone,
        :email,
        :birthday,
        :notes,
        :preferences,
        :loyalty_points,
        :loyalty_tier,
        :total_spent,
        :visit_count,
        :avatar_url,
        :is_active,
        :first_appointment_date,
        :last_appointment_date
      ]

      change LabelleBack.Studio.Changes.NormalizePhone
    end
  end

  policies do
    policy always() do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :name, :string do
      allow_nil? false
      public? true
    end

    attribute :phone, :string do
      allow_nil? false
      public? true
    end

    attribute :phone_normalized, :string, public?: true
    attribute :email, :string, public?: true
    attribute :birthday, :date, public?: true
    attribute :notes, :string, public?: true
    attribute :preferences, :string, public?: true
    attribute :loyalty_points, :integer, default: 0, public?: true

    attribute :loyalty_tier, :atom do
      constraints one_of: [:bronze, :prata, :ouro, :vip]
      default :bronze
      public? true
    end

    attribute :total_spent, :decimal, default: 0, public?: true
    attribute :visit_count, :integer, default: 0, public?: true
    attribute :avatar_url, :string, public?: true
    attribute :is_active, :boolean, default: true, public?: true

    attribute :source, :atom do
      constraints one_of: [:app_cliente, :gestao, :importacao, :atendimento]
      default :gestao
      public? true
    end

    attribute :first_appointment_date, :date, public?: true
    attribute :last_appointment_date, :date, public?: true
  end

  relationships do
    has_many :appointments, LabelleBack.Studio.Appointment
    has_many :transactions, LabelleBack.Studio.Transaction
    has_many :payments, LabelleBack.Studio.Payment
  end

  identities do
    identity :unique_phone_normalized, [:phone_normalized]
  end
end
