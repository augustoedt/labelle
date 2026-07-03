defmodule LabelleBack.Studio.Payment do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "payments"
    repo LabelleBack.Repo
  end

  json_api do
    type "payment"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :transaction_id,
        :appointment_id,
        :client_id,
        :professional_id,
        :payment_date,
        :payment_method,
        :amount,
        :fee_percent,
        :fee_amount,
        :net_amount,
        :installments,
        :card_brand,
        :status,
        :origin,
        :gateway_name,
        :gateway_transaction_id,
        :gateway_status,
        :gateway_payment_method,
        :gateway_payload,
        :gateway_confirmed_at,
        :receipt_url,
        :reconciled,
        :reconciled_at,
        :reconciliation_notes
      ]
    end

    update :update do
      accept [
        :payment_date,
        :payment_method,
        :amount,
        :fee_percent,
        :fee_amount,
        :net_amount,
        :installments,
        :card_brand,
        :status,
        :origin,
        :gateway_name,
        :gateway_transaction_id,
        :gateway_status,
        :gateway_payment_method,
        :gateway_payload,
        :gateway_confirmed_at,
        :receipt_url,
        :reconciled,
        :reconciled_at,
        :reconciliation_notes
      ]
    end
  end

  policies do
    policy always() do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :payment_date, :date, allow_nil?: false, public?: true

    attribute :payment_method, :atom do
      allow_nil? false
      constraints one_of: [:pix, :dinheiro, :debito, :credito, :voucher, :cortesia, :outro]
      public? true
    end

    attribute :amount, :decimal, allow_nil?: false, public?: true
    attribute :fee_percent, :decimal, default: 0, public?: true
    attribute :fee_amount, :decimal, default: 0, public?: true
    attribute :net_amount, :decimal, public?: true
    attribute :installments, :integer, default: 1, public?: true
    attribute :card_brand, :string, public?: true

    attribute :status, :atom do
      constraints one_of: [:pendente, :confirmado, :cancelado, :estornado]
      default :confirmado
      public? true
    end

    attribute :origin, :atom do
      constraints one_of: [:manual, :maquininha, :gateway]
      default :manual
      public? true
    end

    attribute :gateway_name, :string, public?: true
    attribute :gateway_transaction_id, :string, public?: true
    attribute :gateway_status, :string, public?: true
    attribute :gateway_payment_method, :string, public?: true
    attribute :gateway_payload, :map, public?: true
    attribute :gateway_confirmed_at, :utc_datetime_usec, public?: true
    attribute :receipt_url, :string, public?: true
    attribute :reconciled, :boolean, default: false, public?: true
    attribute :reconciled_at, :utc_datetime_usec, public?: true
    attribute :reconciliation_notes, :string, public?: true
  end

  relationships do
    belongs_to :transaction, LabelleBack.Studio.Transaction do
      allow_nil? false
      public? true
    end

    belongs_to :appointment, LabelleBack.Studio.Appointment do
      allow_nil? true
      public? true
    end

    belongs_to :client, LabelleBack.Studio.Client do
      allow_nil? true
      public? true
    end

    belongs_to :professional, LabelleBack.Studio.Professional do
      allow_nil? true
      public? true
    end
  end
end
