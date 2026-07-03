defmodule LabelleBack.Studio.Service do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "services"
    repo LabelleBack.Repo
  end

  json_api do
    type "service"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :name,
        :category,
        :price,
        :duration_minutes,
        :commission_percent,
        :recurrence_days,
        :description,
        :is_active
      ]
    end

    update :update do
      accept [
        :name,
        :category,
        :price,
        :duration_minutes,
        :commission_percent,
        :recurrence_days,
        :description,
        :is_active
      ]
    end
  end

  policies do
    policy action_type(:read) do
      authorize_if always()
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :name, :string do
      allow_nil? false
      public? true
    end

    attribute :category, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:cabelo, :unha, :estetica, :sobrancelha, :maquiagem, :outros]
    end

    attribute :price, :decimal, allow_nil?: false, public?: true
    attribute :duration_minutes, :integer, allow_nil?: false, public?: true
    attribute :commission_percent, :decimal, public?: true
    attribute :recurrence_days, :integer, public?: true
    attribute :description, :string, public?: true
    attribute :is_active, :boolean, default: true, public?: true
  end

  relationships do
    has_many :appointments, LabelleBack.Studio.Appointment, public?: true
    has_many :professional_services, LabelleBack.Studio.ProfessionalService, public?: true

    many_to_many :professionals, LabelleBack.Studio.Professional do
      through LabelleBack.Studio.ProfessionalService
      source_attribute_on_join_resource :service_id
      destination_attribute_on_join_resource :professional_id
      public? true
    end
  end
end
