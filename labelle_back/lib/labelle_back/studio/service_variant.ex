defmodule LabelleBack.Studio.ServiceVariant do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "service_variants"
    repo LabelleBack.Repo
  end

  json_api do
    type "service_variant"
  end

  actions do
    defaults [:read]

    create :create do
      primary? true

      accept [
        :service_id,
        :name,
        :description,
        :price,
        :duration_minutes,
        :commission_percent,
        :is_active
      ]
    end

    update :update do
      primary? true
      accept [:name, :description, :price, :duration_minutes, :commission_percent, :is_active]
    end
  end

  policies do
    policy action_type(:read) do
      authorize_if always()
    end

    policy action_type([:create, :update]) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id
    attribute :name, :string, allow_nil?: false, public?: true
    attribute :description, :string, public?: true
    attribute :price, :decimal, allow_nil?: false, public?: true, constraints: [min: 0]
    attribute :duration_minutes, :integer, allow_nil?: false, public?: true, constraints: [min: 1]
    attribute :commission_percent, :decimal, public?: true, constraints: [min: 0, max: 100]
    attribute :is_active, :boolean, default: true, allow_nil?: false, public?: true
  end

  relationships do
    belongs_to :service, LabelleBack.Studio.Service, allow_nil?: false, public?: true
  end

  identities do
    identity :unique_service_variant, [:service_id, :name]
  end
end
