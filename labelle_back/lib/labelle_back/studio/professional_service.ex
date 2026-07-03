defmodule LabelleBack.Studio.ProfessionalService do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "professional_services"
    repo LabelleBack.Repo
  end

  json_api do
    type "professional_service"
  end

  actions do
    defaults [:read, :destroy, create: :*]
  end

  policies do
    policy always() do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id
  end

  relationships do
    belongs_to :professional, LabelleBack.Studio.Professional do
      allow_nil? false
      public? true
    end

    belongs_to :service, LabelleBack.Studio.Service do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_professional_service, [:professional_id, :service_id]
  end
end
