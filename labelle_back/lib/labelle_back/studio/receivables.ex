defmodule LabelleBack.Studio.Receivables do
  require Ash.Query
  alias LabelleBack.Studio.{AppointmentService, Payment}

  def today, do: DateTime.utc_now() |> DateTime.add(-3 * 3600, :second) |> DateTime.to_date()

  def total(appointment) do
    items =
      AppointmentService
      |> Ash.Query.filter(appointment_id == ^appointment.id)
      |> Ash.read!(authorize?: false)

    Enum.reduce(
      items,
      Decimal.add(appointment.price || Decimal.new(0), appointment.tip_amount || Decimal.new(0)),
      fn item, acc -> Decimal.add(acc, item.price || Decimal.new(0)) end
    )
  end

  def payments(id),
    do:
      Payment
      |> Ash.Query.filter(transaction_id == ^id and status == :confirmado)
      |> Ash.read!(authorize?: false)

  def sum(payments),
    do: Enum.reduce(payments, Decimal.new(0), fn p, acc -> Decimal.add(acc, p.amount) end)
end
