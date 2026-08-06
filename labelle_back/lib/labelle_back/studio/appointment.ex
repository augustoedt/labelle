defmodule LabelleBack.Studio.Appointment do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource, AshStateMachine]

  postgres do
    table "appointments"
    repo LabelleBack.Repo

    check_constraints do
      check_constraint :status, "appointments_status_valid",
        check:
          "status IN ('agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado')",
        message: "status inválido"

      check_constraint :price, "appointments_price_non_negative",
        check: "price >= 0",
        message: "o preço não pode ser negativo"

      check_constraint :duration_minutes, "appointments_duration_positive",
        check: "duration_minutes > 0",
        message: "a duração deve ser positiva"
    end
  end

  json_api do
    type "appointment"
  end

  state_machine do
    state_attribute :status
    initial_states [:agendado]
    default_initial_state :agendado

    transitions do
      transition :confirm, from: [:agendado], to: :confirmado
      transition :start, from: [:agendado, :confirmado], to: :em_atendimento
      transition :finalize, from: [:em_atendimento], to: :concluido
      transition :cancel, from: [:agendado, :confirmado, :em_atendimento], to: :cancelado
    end
  end

  actions do
    defaults [:read, :destroy]

    # Status NUNCA é aceito como input: o ciclo de vida do agendamento
    # anda só pelas actions de transição declaradas no state_machine
    # (confirm/start/finalize/cancel), que validam a origem.
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
        :payment_method,
        :notes,
        :source
      ]

      change LabelleBack.Studio.Changes.SnapshotAppointmentFields

      # Agendamento feito pela cliente no app público: o estúdio manda a
      # confirmação de recebimento pra ela via WhatsApp da empresa, em vez
      # do fluxo antigo (cliente mandando mensagem pro estúdio via wa.me).
      change {LabelleBack.Studio.Changes.SendWhatsAppMessage, kind: :new_booking_notification} do
        where attribute_equals(:source, :online)
      end
    end

    # Agendamento feito pela cliente no app público (sem login). Accept
    # mínimo de propósito: status, preço, duração e origem NUNCA vêm do
    # cliente — o servidor trava o status em :agendado, força source
    # :online e calcula preço/duração a partir do serviço (+ promoção
    # ativa), então um anônimo não consegue criar agendamento "concluído"
    # nem com preço arbitrário.
    create :book_online do
      accept [
        :client_id,
        :client_name,
        :client_phone,
        :professional_id,
        :service_id,
        :date,
        :time
      ]

      change set_attribute(:source, :online)
      change LabelleBack.Studio.Changes.SnapshotAppointmentFields
      change LabelleBack.Studio.Changes.ApplyActivePromotion
      change {LabelleBack.Studio.Changes.SendWhatsAppMessage, kind: :new_booking_notification}
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
        :payment_method,
        :notes
      ]

      change LabelleBack.Studio.Changes.SnapshotAppointmentFields
    end

    update :finalize do
      require_atomic? false

      accept [:payment_method]

      validate present(:payment_method) do
        message "informe a forma de pagamento para finalizar o atendimento"
      end

      change transition_state(:concluido)
      change LabelleBack.Studio.Changes.RegisterChargeOnFinalize
    end

    update :confirm do
      require_atomic? false
      accept []

      change transition_state(:confirmado)
      change {LabelleBack.Studio.Changes.SendWhatsAppMessage, kind: :confirmation}
    end

    update :start do
      accept []

      change transition_state(:em_atendimento)
    end

    update :cancel do
      accept []

      change transition_state(:cancelado)
    end

    update :send_reminder do
      require_atomic? false
      accept []

      change {LabelleBack.Studio.Changes.SendWhatsAppMessage, kind: :reminder}
    end

    read :by_client_phone do
      description "Agendamentos da cliente pelo telefone, mais recentes primeiro (máx. 200)."

      argument :phone, :string, allow_nil?: false

      prepare LabelleBack.Studio.Preparations.FilterAppointmentsByClientPhone
      prepare build(sort: [date: :desc], limit: 200)
    end

    action :available_slots, {:array, :string} do
      description "Horários livres da profissional na data (grade de 30 min)."

      argument :professional_id, :uuid, allow_nil?: false
      argument :date, :date, allow_nil?: false
      argument :duration_minutes, :integer
      argument :work_start, :string
      argument :work_end, :string

      run LabelleBack.Studio.Actions.ComputeAvailableSlots
    end
  end

  policies do
    # Única porta de entrada anônima: a action pública de accept mínimo.
    policy action(:book_online) do
      authorize_if always()
    end

    # Criação manual: recepção (admin) ou a própria profissional.
    policy action(:create) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if LabelleBack.Studio.Checks.ActorIsAppointmentProfessional
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
      allow_nil? false
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

    has_many :service_items, LabelleBack.Studio.AppointmentService, public?: true
    has_many :transactions, LabelleBack.Studio.Transaction, public?: true
    has_many :payments, LabelleBack.Studio.Payment, public?: true
  end
end
