defmodule LabelleBack.Studio.ClientReminder do
  @moduledoc """
  Lembrete de retorno para clientes, gerado automaticamente todo dia:

  - `:agradecimento` — 20 dias após o último atendimento concluído, agradece
    a preferência e sugere um novo agendamento;
  - `:reengajamento` — a cada 45 dias depois do último lembrete enviado,
    enquanto o cliente não fizer um novo serviço.

  Enquanto não houver provedor de WhatsApp integrado (ver
  `LabelleBack.Messaging.WhatsApp`), os lembretes ficam `:pendente` e a
  equipe envia manualmente pelo front (wa.me) marcando como enviado.
  """

  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource, AshOban]

  postgres do
    table "client_reminders"
    repo LabelleBack.Repo
  end

  json_api do
    type "client_reminder"
  end

  oban do
    scheduled_actions do
      # 12:00 UTC = 09:00 em America/Sao_Paulo
      schedule :generate_due, "0 12 * * *" do
        action :generate_due
        queue :reminders
        worker_module_name LabelleBack.Studio.ClientReminder.Workers.GenerateDue
      end

      schedule :deliver_pending, "30 12 * * *" do
        action :deliver_pending
        queue :reminders
        worker_module_name LabelleBack.Studio.ClientReminder.Workers.DeliverPending
      end
    end
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:client_id, :kind, :due_date, :message, :client_name, :client_phone]
    end

    update :mark_sent do
      require_atomic? false

      argument :sent_via, :atom do
        constraints one_of: [:manual, :automatico]
        default :manual
      end

      change set_attribute(:status, :enviado)
      change set_attribute(:sent_at, &DateTime.utc_now/0)
      change atomic_update(:sent_via, expr(^arg(:sent_via)))
    end

    update :mark_failed do
      require_atomic? false

      argument :reason, :string, allow_nil?: true

      change set_attribute(:status, :falhou)
      change atomic_update(:failure_reason, expr(^arg(:reason)))
    end

    update :cancel do
      change set_attribute(:status, :cancelado)
    end

    action :generate_due, :integer do
      run LabelleBack.Studio.Reminders.GenerateDue
    end

    action :deliver_pending, :integer do
      run LabelleBack.Studio.Reminders.DeliverPending
    end
  end

  policies do
    bypass AshOban.Checks.AshObanInteraction do
      authorize_if always()
    end

    policy always() do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :kind, :atom do
      allow_nil? false
      constraints one_of: [:agradecimento, :reengajamento]
      public? true
    end

    attribute :status, :atom do
      constraints one_of: [:pendente, :enviado, :falhou, :cancelado]
      default :pendente
      public? true
    end

    attribute :channel, :atom do
      constraints one_of: [:whatsapp]
      default :whatsapp
      public? true
    end

    attribute :due_date, :date, allow_nil?: false, public?: true
    attribute :message, :string, allow_nil?: false, public?: true
    attribute :client_name, :string, public?: true
    attribute :client_phone, :string, public?: true
    attribute :sent_at, :utc_datetime_usec, public?: true

    attribute :sent_via, :atom do
      constraints one_of: [:manual, :automatico]
      public? true
    end

    attribute :failure_reason, :string, public?: true

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  relationships do
    belongs_to :client, LabelleBack.Studio.Client do
      allow_nil? false
      public? true
    end
  end
end
