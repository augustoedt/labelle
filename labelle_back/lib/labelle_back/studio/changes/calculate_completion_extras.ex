defmodule LabelleBack.Studio.Changes.CalculateCompletionExtras do
  use Ash.Resource.Change
  require Ash.Query

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &calculate/1)
  end

  defp calculate(changeset) do
    items =
      LabelleBack.Studio.AppointmentService
      |> Ash.Query.filter(appointment_id == ^changeset.data.id)
      |> Ash.read!(authorize?: false)

    total =
      Enum.reduce(items, changeset.data.price || Decimal.new(0), fn item, acc ->
        Decimal.add(acc, item.price || Decimal.new(0))
      end)

    input = Ash.Changeset.get_attribute(changeset, :tip_input) || Decimal.new(0)

    tip =
      if Ash.Changeset.get_attribute(changeset, :tip_mode) == :percent,
        do: Decimal.div(Decimal.mult(total, input), Decimal.new(100)),
        else: input

    bonus =
      if Ash.Changeset.get_attribute(changeset, :referral_professional_id) ||
           Ash.Changeset.get_attribute(changeset, :professional_referral),
         do:
           if(Ash.Changeset.get_attribute(changeset, :payment_method) in [:debito, :credito],
             do: 10,
             else: 15
           ),
         else: 0

    changeset
    |> Ash.Changeset.force_change_attribute(:tip_amount, Decimal.round(tip, 2))
    |> Ash.Changeset.force_change_attribute(:referral_bonus_percent, Decimal.new(bonus))
  end
end
