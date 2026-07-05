defmodule LabelleBack.Studio.AppointmentService do
  @moduledoc """
  Um serviço adicional realizado dentro de um atendimento, além do serviço
  principal do agendamento — inclusive serviços não previstos adicionados
  durante o atendimento. O total cobrado na finalização é
  `appointment.price + soma dos itens`.
  """

  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "appointment_services"
    repo LabelleBack.Repo
  end

  json_api do
    type "appointment_service"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:appointment_id, :service_id, :price, :duration_minutes, :unplanned]

      change LabelleBack.Studio.Changes.SnapshotServiceItemFields
    end

    update :update do
      require_atomic? false

      accept [:service_id, :price, :duration_minutes, :unplanned]

      change LabelleBack.Studio.Changes.SnapshotServiceItemFields
    end
  end

  policies do
    policy action_type(:create) do
      authorize_if always()
    end

    policy action_type([:read, :update, :destroy]) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if expr(appointment.professional.user_id == ^actor(:id))
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :service_name, :string, public?: true
    attribute :price, :decimal, public?: true
    attribute :duration_minutes, :integer, public?: true

    attribute :unplanned, :boolean do
      default false
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  relationships do
    belongs_to :appointment, LabelleBack.Studio.Appointment do
      allow_nil? false
      public? true
    end

    belongs_to :service, LabelleBack.Studio.Service do
      allow_nil? false
      public? true
    end
  end
end
