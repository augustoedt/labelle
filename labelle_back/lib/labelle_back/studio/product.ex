defmodule LabelleBack.Studio.Product do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "products"
    repo LabelleBack.Repo
  end

  json_api do
    type "product"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:name, :category, :price, :cost, :quantity, :min_quantity, :description, :is_active]
    end

    update :update do
      accept [:name, :category, :price, :cost, :quantity, :min_quantity, :description, :is_active]
    end
  end

  policies do
    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if actor_attribute_equals(:role, :profissional)
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

    attribute :category, :string, public?: true
    attribute :price, :decimal, allow_nil?: false, public?: true
    attribute :cost, :decimal, public?: true
    attribute :quantity, :integer, default: 0, public?: true
    attribute :min_quantity, :integer, default: 5, public?: true
    attribute :description, :string, public?: true
    attribute :is_active, :boolean, default: true, public?: true
  end
end
