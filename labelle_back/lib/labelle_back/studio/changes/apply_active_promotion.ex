defmodule LabelleBack.Studio.Changes.ApplyActivePromotion do
  @moduledoc """
  Aplica sobre o preço do agendamento o desconto da promoção ativa do
  serviço — espelha o cálculo que o app da cliente exibe antes de
  confirmar (primeira promoção com `is_active == true` para o serviço).

  Deve rodar DEPOIS do `SnapshotAppointmentFields`, que define o preço
  cheio do serviço. Usada apenas no agendamento online (`book_online`),
  onde o preço nunca vem do cliente.
  """

  use Ash.Resource.Change

  alias LabelleBack.Studio.Promotion

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &apply_promotion/1)
  end

  defp apply_promotion(changeset) do
    with service_id when not is_nil(service_id) <-
           Ash.Changeset.get_attribute(changeset, :service_id),
         price when not is_nil(price) <- Ash.Changeset.get_attribute(changeset, :price),
         %Promotion{} = promotion <- active_promotion_for(service_id) do
      Ash.Changeset.force_change_attribute(changeset, :price, discounted(price, promotion))
    else
      _ -> changeset
    end
  end

  defp active_promotion_for(service_id) do
    Promotion
    |> Ash.Query.filter(is_active == true and service_id == ^service_id)
    |> Ash.Query.limit(1)
    |> Ash.read_one!(authorize?: false)
  end

  defp discounted(price, %Promotion{discount_type: :percent, discount_value: value}) do
    price
    |> Decimal.mult(Decimal.sub(Decimal.new(1), Decimal.div(value, Decimal.new(100))))
    |> Decimal.round(2)
    |> clamp()
  end

  defp discounted(price, %Promotion{discount_type: :value, discount_value: value}) do
    price |> Decimal.sub(value) |> clamp()
  end

  defp clamp(decimal) do
    if Decimal.negative?(decimal), do: Decimal.new(0), else: decimal
  end
end
