defmodule LabelleBack.Studio.FinancialReconciliation do
  @moduledoc "Read-only preview and idempotent repair of stale paid service charges. Never creates charges or changes payment status."
  require Ash.Query
  alias LabelleBack.Studio.{Appointment, AppointmentService, Transaction, FinancialEdit}

  def preview do
    Appointment
    |> Ash.Query.filter(status == :concluido)
    |> Ash.read!(authorize?: false)
    |> Enum.flat_map(fn appointment ->
      transactions =
        Transaction
        |> Ash.Query.filter(
          appointment_id == ^appointment.id and type == :entrada and category == :servico and
            status == :pago
        )
        |> Ash.read!(authorize?: false)

      case transactions do
        [transaction] when transaction.status == :pago ->
          expected = expected_total(appointment)

          if Decimal.equal?(transaction.amount, expected),
            do: [],
            else: [
              %{
                appointment_id: appointment.id,
                transaction_id: transaction.id,
                date: appointment.date,
                old_amount: transaction.amount,
                new_amount: expected
              }
            ]

        _ ->
          []
      end
    end)
  end

  def run! do
    case LabelleBack.Repo.transaction(fn ->
           Enum.flat_map(preview(), fn candidate ->
             LabelleBack.Repo.query!("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
               candidate.appointment_id
             ])

             appointment = Ash.get!(Appointment, candidate.appointment_id, authorize?: false)
             transaction = Ash.get!(Transaction, candidate.transaction_id, authorize?: false)
             expected = expected_total(appointment)

             if transaction.status == :pago && !Decimal.equal?(transaction.amount, expected) do
               LabelleBack.Studio.Changes.RegisterChargeOnFinalize.sync_completed!(appointment.id)

               FinancialEdit
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   appointment_id: appointment.id,
                   record_id: transaction.id,
                   record_kind: "reconciliation",
                   action_name: "reconcile_charge",
                   actor_email: "Sistema — reconciliação",
                   old_values: %{amount: Decimal.to_string(transaction.amount)},
                   new_values: %{amount: Decimal.to_string(expected)},
                   comment:
                     "Reconciliação da cobrança paga com os valores atuais dos serviços e gorjeta, corrigindo edição anterior que não atualizou o financeiro."
                 },
                 authorize?: false
               )
               |> Ash.create!()

               [%{candidate | old_amount: transaction.amount, new_amount: expected}]
             else
               []
             end
           end)
         end) do
      {:ok, changes} -> changes
      {:error, reason} -> raise "Reconciliação revertida: #{inspect(reason)}"
    end
  end

  defp expected_total(appointment) do
    items =
      AppointmentService
      |> Ash.Query.filter(appointment_id == ^appointment.id)
      |> Ash.read!(authorize?: false)

    services =
      Enum.reduce(items, appointment.price || Decimal.new(0), fn item, acc ->
        Decimal.add(acc, item.price || Decimal.new(0))
      end)

    tip =
      if appointment.tip_mode == :percent,
        do: Decimal.div(Decimal.mult(services, appointment.tip_input), Decimal.new(100)),
        else: appointment.tip_input

    Decimal.add(services, Decimal.round(tip, 2))
  end
end
