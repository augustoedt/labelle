defmodule LabelleBack.Studio.FinancialEdit do
  use Ash.Resource,
    otp_app: :labelle_back,
    domain: LabelleBack.Studio,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshJsonApi.Resource]

  postgres do
    table "financial_edits"
    repo LabelleBack.Repo
  end

  json_api do
    type "financial_edit"
  end

  actions do
    defaults [:read]

    create :create do
      accept [
        :appointment_id,
        :record_id,
        :record_kind,
        :action_name,
        :actor_id,
        :actor_email,
        :old_values,
        :new_values,
        :comment
      ]
    end

    update :add_comment do
      require_atomic? false
      accept [:comment]
      validate present(:comment)

      change fn cs, context ->
        cs
        |> Ash.Changeset.force_change_attribute(:commented_at, DateTime.utc_now())
        |> Ash.Changeset.force_change_attribute(:commented_by, context.actor && context.actor.id)
      end
    end
  end

  policies do
    policy action(:create) do
      forbid_if always()
    end

    policy action([:read, :add_comment]) do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id
    attribute :appointment_id, :uuid, public?: true, allow_nil?: false
    attribute :record_id, :uuid, public?: true, allow_nil?: false
    attribute :record_kind, :string, public?: true, allow_nil?: false
    attribute :action_name, :string, public?: true, allow_nil?: false
    attribute :actor_id, :uuid, public?: true
    attribute :actor_email, :string, public?: true
    attribute :old_values, :map, public?: true
    attribute :new_values, :map, public?: true
    attribute :comment, :string, public?: true, constraints: [trim?: true]
    attribute :commented_at, :utc_datetime_usec, public?: true
    attribute :commented_by, :uuid, public?: true
    create_timestamp :inserted_at, public?: true
  end
end
