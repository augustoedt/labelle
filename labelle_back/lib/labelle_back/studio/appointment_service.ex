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

    check_constraints do
      check_constraint :price, "appointment_services_price_non_negative",
        check: "price >= 0",
        message: "o preço não pode ser negativo"

      check_constraint :duration_minutes, "appointment_services_duration_positive",
        check: "duration_minutes > 0",
        message: "a duração deve ser positiva"
    end
  end

  json_api do
    type "appointment_service"
  end

  actions do
    defaults [:read]

    destroy :destroy do
      require_atomic? false
      argument :edit_comment, :string
      change LabelleBack.Studio.Changes.AuditCompletedEdit
    end

    create :create do
      argument :edit_comment, :string

      accept [
        :professional_id,
        :appointment_id,
        :service_id,
        :service_variant_id,
        :price,
        :duration_minutes,
        :unplanned
      ]

      validate {LabelleBack.Studio.Validations.AdminOnlyFinancialInputs,
                fields: [:price, :duration_minutes]}

      change LabelleBack.Studio.Changes.SnapshotServiceItemFields
      change LabelleBack.Studio.Changes.AssignServiceItemProfessional
      change LabelleBack.Studio.Changes.AuditCompletedEdit
    end

    update :edit_financial do
      require_atomic? false
      accept [:price, :commission_percent]
      argument :edit_comment, :string
      change LabelleBack.Studio.Changes.AuditCompletedEdit
    end

    update :set_commission do
      require_atomic? false
      argument :edit_comment, :string
      change LabelleBack.Studio.Changes.AuditCompletedEdit
      accept [:commission_percent]
      validate present(:commission_percent)
    end

    update :update do
      require_atomic? false
      argument :edit_comment, :string

      accept [
        :professional_id,
        :service_id,
        :service_variant_id,
        :price,
        :duration_minutes,
        :unplanned
      ]

      change LabelleBack.Studio.Changes.SnapshotServiceItemFields
      change LabelleBack.Studio.Changes.AssignServiceItemProfessional
      change LabelleBack.Studio.Changes.AuditCompletedEdit
    end
  end

  policies do
    policy action([:set_commission, :edit_financial]) do
      authorize_if actor_attribute_equals(:role, :admin)
    end

    # Fechado: o preço do item entra no total cobrado no finalize, então
    # criar item é restrito a admin ou à profissional dona do atendimento.
    policy action_type(:create) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if LabelleBack.Studio.Checks.ActorIsServiceItemProfessional
    end

    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if expr(appointment.professional.user_id == ^actor(:id))
      authorize_if expr(professional.user_id == ^actor(:id))
    end

    policy action_type(:destroy) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if expr(appointment.professional.user_id == ^actor(:id))
    end

    # Preços dos itens entram diretamente na cobrança do atendimento.
    policy action(:update) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :professional_name, :string, public?: true

    attribute :service_name, :string, public?: true
    attribute :variant_name, :string, public?: true
    attribute :commission_percent, :decimal, public?: true, constraints: [min: 0, max: 100]
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
    belongs_to :professional, LabelleBack.Studio.Professional, public?: true, allow_nil?: false

    belongs_to :appointment, LabelleBack.Studio.Appointment do
      allow_nil? false
      public? true
    end

    belongs_to :service_variant, LabelleBack.Studio.ServiceVariant, public?: true

    belongs_to :service, LabelleBack.Studio.Service do
      allow_nil? false
      public? true
    end
  end
end
