defmodule LabelleBack.Studio.Promotion do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "promotions"
    repo LabelleBack.Repo
  end

  json_api do
    type "promotion"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :name,
        :description,
        :discount_type,
        :discount_value,
        :service_id,
        :start_date,
        :end_date,
        :is_active,
        :rules
      ]
    end

    update :update do
      accept [
        :name,
        :description,
        :discount_type,
        :discount_value,
        :service_id,
        :start_date,
        :end_date,
        :is_active,
        :rules
      ]
    end
  end

  policies do
    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if actor_attribute_equals(:role, :profissional)
      authorize_if expr(is_active == true)
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

    attribute :description, :string, public?: true

    attribute :discount_type, :atom do
      allow_nil? false
      constraints one_of: [:percent, :value]
      public? true
    end

    attribute :discount_value, :decimal, allow_nil?: false, public?: true
    attribute :start_date, :date, public?: true
    attribute :end_date, :date, public?: true
    attribute :is_active, :boolean, default: true, public?: true
    attribute :rules, :string, public?: true
  end

  relationships do
    belongs_to :service, LabelleBack.Studio.Service do
      allow_nil? true
      public? true
    end
  end
end
