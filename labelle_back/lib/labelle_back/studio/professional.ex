defmodule LabelleBack.Studio.Professional do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "professionals"
    repo LabelleBack.Repo
  end

  json_api do
    type "professional"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :name,
        :phone,
        :email,
        :user_id,
        :type,
        :commission_percent,
        :rent_value,
        :avatar_url,
        :color,
        :is_active,
        :work_days,
        :work_start,
        :work_end
      ]
    end

    update :update do
      accept [
        :name,
        :phone,
        :email,
        :user_id,
        :type,
        :commission_percent,
        :rent_value,
        :avatar_url,
        :color,
        :is_active,
        :work_days,
        :work_start,
        :work_end
      ]
    end
  end

  policies do
    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if expr(user_id == ^actor(:id))
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

    attribute :phone, :string do
      allow_nil? false
      public? true
    end

    attribute :email, :string, public?: true

    attribute :type, :atom do
      constraints one_of: [:fixo, :comissao, :aluguel]
      default :comissao
      public? true
    end

    attribute :commission_percent, :decimal, default: 40, public?: true
    attribute :rent_value, :decimal, public?: true
    attribute :avatar_url, :string, public?: true
    attribute :color, :string, public?: true
    attribute :is_active, :boolean, default: true, public?: true
    attribute :work_days, {:array, :integer}, public?: true
    attribute :work_start, :time, public?: true
    attribute :work_end, :time, public?: true
  end

  relationships do
    belongs_to :user, LabelleBack.Accounts.User do
      domain LabelleBack.Accounts
      allow_nil? true
      public? true
    end

    has_many :appointments, LabelleBack.Studio.Appointment, public?: true
    has_many :professional_services, LabelleBack.Studio.ProfessionalService, public?: true

    many_to_many :services, LabelleBack.Studio.Service do
      through LabelleBack.Studio.ProfessionalService
      source_attribute_on_join_resource :professional_id
      destination_attribute_on_join_resource :service_id
      public? true
    end
  end
end
