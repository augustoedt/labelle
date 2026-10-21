defmodule LabelleBack.Studio.Changes.RecordPayment do
  use Ash.Resource.Change
  alias LabelleBack.Studio.{Transaction, Payment, Receivables}

  @impl true
  def change(changeset, _opts, _context), do: Ash.Changeset.before_action(changeset, &record/1)

  defp record(cs) do
    if cs.data.appointment_id do
      LabelleBack.Repo.query!("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        cs.data.appointment_id
      ])
    end

    LabelleBack.Repo.query!("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [cs.data.id])
    transaction = Ash.get!(Transaction, cs.data.id, authorize?: false)
    existing = Receivables.payments(transaction.id)
    reference = Ash.Changeset.get_argument(cs, :reference)
    rows = Ash.Changeset.get_argument(cs, :receipts) || []
    parsed = Enum.map(rows, &parse/1)

    cond do
      Enum.any?(existing, &(&1.gateway_transaction_id == reference)) ->
        cs |> Ash.Changeset.force_change_attribute(:status, transaction.status)

      transaction.status not in [:pendente_confirmacao, :pagamento_parcial] ->
        Ash.Changeset.add_error(cs, message: "a conta não está pendente")

      parsed == [] || Enum.any?(parsed, &is_nil/1) ->
        Ash.Changeset.add_error(cs, field: :receipts, message: "informe pagamentos válidos")

      Decimal.compare(
        Decimal.add(Receivables.sum(existing), Receivables.sum(parsed)),
        transaction.amount
      ) == :gt ->
        Ash.Changeset.add_error(cs,
          field: :receipts,
          message: "o pagamento excede o saldo em aberto"
        )

      true ->
        for row <- parsed do
          Payment
          |> Ash.Changeset.for_create(
            :create,
            Map.merge(row, %{
              transaction_id: transaction.id,
              appointment_id: transaction.appointment_id,
              client_id: transaction.client_id,
              professional_id: transaction.professional_id,
              payment_date: Ash.Changeset.get_argument(cs, :payment_date),
              gateway_transaction_id: reference,
              status: :confirmado,
              origin: :manual
            }),
            authorize?: false
          )
          |> Ash.create!()
        end

        all = Receivables.payments(transaction.id)
        paid = Receivables.sum(all)

        fees =
          Enum.reduce(all, Decimal.new(0), fn p, acc ->
            Decimal.add(acc, p.fee_amount || Decimal.new(0))
          end)

        methods = Enum.uniq(Enum.map(all, & &1.payment_method))

        if transaction.appointment_id do
          appointment =
            Ash.get!(LabelleBack.Studio.Appointment, transaction.appointment_id,
              authorize?: false
            )

          method =
            if Enum.any?(methods, &(&1 in [:debito, :credito])), do: :credito, else: hd(methods)

          if method in [:pix, :dinheiro, :debito, :credito] do
            appointment
            |> Ash.Changeset.for_update(:refresh_totals, %{}, authorize?: false)
            |> Ash.Changeset.force_change_attribute(:payment_method, method)
            |> Ash.update!()
          end
        end

        cs
        |> Ash.Changeset.force_change_attribute(
          :status,
          if(Decimal.equal?(paid, transaction.amount), do: :pago, else: :pagamento_parcial)
        )
        |> Ash.Changeset.force_change_attribute(
          :payment_method,
          if(length(methods) == 1, do: hd(methods), else: :multiplo)
        )
        |> Ash.Changeset.force_change_attribute(:total_fees, fees)
        |> Ash.Changeset.force_change_attribute(:net_amount, Decimal.sub(paid, fees))
    end
  end

  defp parse_decimal(value) when is_number(value) or is_binary(value),
    do: Decimal.parse(to_string(value))

  defp parse_decimal(_), do: :error

  defp parse(row) do
    with {amount, ""} <- parse_decimal(row["amount"]),
         {fee, ""} <- parse_decimal(row["fee_percent"] || 0),
         true <-
           Decimal.compare(amount, 0) == :gt && Decimal.compare(fee, 0) != :lt &&
             Decimal.compare(fee, 100) != :gt,
         {installments, ""} <- Integer.parse(to_string(row["installments"] || 1)),
         true <- installments >= 1 && installments <= 12,
         method when not is_nil(method) <-
           Enum.find(
             [:pix, :dinheiro, :debito, :credito, :voucher, :cortesia, :outro],
             &(to_string(&1) == row["payment_method"])
           ) do
      amount = Decimal.round(amount, 2)

      if Decimal.compare(amount, 0) != :gt,
        do: raise(ArgumentError, "valor inferior a um centavo")

      fee_amount = Decimal.mult(amount, fee) |> Decimal.div(100) |> Decimal.round(2)

      %{
        amount: amount,
        installments: installments,
        card_brand:
          if(is_binary(row["card_brand"]), do: String.slice(row["card_brand"], 0, 60), else: nil),
        payment_method: method,
        fee_percent: fee,
        fee_amount: fee_amount,
        net_amount: Decimal.sub(amount, fee_amount)
      }
    else
      _ -> nil
    end
  rescue
    ArgumentError -> nil
  end
end
