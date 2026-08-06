defmodule LabelleBack.Studio.Transaction do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "transactions"
    repo LabelleBack.Repo

    check_constraints do
      check_constraint :status, "transactions_status_valid",
        check: "status IN ('pendente_confirmacao', 'pagamento_parcial', 'pago', 'cancelado', 'estornado')",
        message: "status inválido"

      check_constraint :amount, "transactions_amount_non_negative",
        check: "amount >= 0",
        message: "o valor não pode ser negativo"
    end
  end

  json_api do
    type "transaction"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :type,
        :category,
        :description,
        :amount,
        :net_amount,
        :total_fees,
        :date,
        :payment_method,
        :appointment_id,
        :professional_id,
        :client_id,
        :status
      ]
    end

    update :update do
      accept [
        :type,
        :category,
        :description,
        :amount,
        :net_amount,
        :total_fees,
        :date,
        :payment_method,
        :appointment_id,
        :professional_id,
        :client_id,
        :status
      ]
    end
  end

  policies do
    # O profissional enxerga os próprios lançamentos (comissões/atendimentos);
    # escrita continua restrita ao staff — a transação do atendimento é criada
    # pelo backend na action finalize do Appointment.
    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if expr(professional.user_id == ^actor(:id))
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :type, :atom do
      allow_nil? false
      constraints one_of: [:entrada, :saida]
      public? true
    end

    attribute :category, :atom do
      constraints one_of: [
                    :servico,
                    :produto,
                    :aluguel,
                    :comissao,
                    :despesa_fixa,
                    :despesa_variavel,
                    :outros
                  ]

      public? true
    end

    attribute :description, :string, public?: true
    attribute :amount, :decimal, allow_nil?: false, public?: true
    attribute :net_amount, :decimal, public?: true
    attribute :total_fees, :decimal, default: 0, public?: true
    attribute :date, :date, allow_nil?: false, public?: true

    attribute :payment_method, :atom do
      constraints one_of: [
                    :pix,
                    :dinheiro,
                    :debito,
                    :credito,
                    :voucher,
                    :cortesia,
                    :outro,
                    :multiplo,
                    :a_definir
                  ]

      default :a_definir
      public? true
    end

    attribute :status, :atom do
      constraints one_of: [
                    :pendente_confirmacao,
                    :pagamento_parcial,
                    :pago,
                    :cancelado,
                    :estornado
                  ]

      default :pago
      public? true
    end
  end

  relationships do
    belongs_to :appointment, LabelleBack.Studio.Appointment do
      allow_nil? true
      public? true
    end

    belongs_to :professional, LabelleBack.Studio.Professional do
      allow_nil? true
      public? true
    end

    belongs_to :client, LabelleBack.Studio.Client do
      allow_nil? true
      public? true
    end

    has_many :payments, LabelleBack.Studio.Payment, public?: true
  end
end
