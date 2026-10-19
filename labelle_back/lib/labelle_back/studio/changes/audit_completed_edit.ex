defmodule LabelleBack.Studio.Changes.AuditCompletedEdit do
  use Ash.Resource.Change
  alias LabelleBack.Studio.{Appointment, FinancialEdit}

  @fields [
    :price,
    :commission_percent,
    :service_id,
    :service_variant_id,
    :professional_id,
    :professional_referral,
    :referral_professional_id,
    :date,
    :time,
    :duration_minutes,
    :payment_method,
    :notes
  ]
  @impl true
  def change(changeset, _opts, context) do
    changeset
    |> Ash.Changeset.before_action(fn cs ->
      id =
        if cs.resource == Appointment,
          do: cs.data.id,
          else: Ash.Changeset.get_attribute(cs, :appointment_id)

      LabelleBack.Repo.query!("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [id])
      parent = Ash.get!(Appointment, id, authorize?: false)

      old =
        if cs.action_type == :create,
          do: nil,
          else: Ash.get!(cs.resource, cs.data.id, authorize?: false)

      if parent.status == :concluido && context.actor && context.actor.role != :admin do
        Ash.Changeset.add_error(cs,
          message: "somente a administração pode editar atendimento concluído"
        )
      else
        Ash.Changeset.set_context(cs, %{financial_edit_parent: parent, financial_edit_old: old})
      end
    end)
    |> Ash.Changeset.after_action(fn cs, record ->
      parent = cs.context.financial_edit_parent
      old = snapshot(cs.context.financial_edit_old)
      new = if cs.action_type == :destroy, do: %{}, else: snapshot(record)

      if parent.status == :concluido && old != new do
        FinancialEdit
        |> Ash.Changeset.for_create(
          :create,
          %{
            appointment_id: parent.id,
            record_id: record.id,
            record_kind: if(cs.resource == Appointment, do: "appointment", else: "item"),
            action_name: to_string(cs.action.name),
            actor_id: context.actor && context.actor.id,
            actor_email: context.actor && to_string(context.actor.email),
            old_values: old,
            new_values: new,
            comment: Ash.Changeset.get_argument(cs, :edit_comment)
          },
          authorize?: false
        )
        |> Ash.create!()

        refreshed = LabelleBack.Studio.Changes.RegisterChargeOnFinalize.sync_completed!(parent.id)
        {:ok, if(cs.resource == Appointment, do: refreshed, else: record)}
      else
        {:ok, record}
      end
    end)
  end

  defp snapshot(nil), do: %{}

  defp snapshot(record) do
    record |> Map.take(@fields) |> Jason.encode!() |> Jason.decode!()
  end
end
