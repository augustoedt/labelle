defmodule LabelleBack.Studio.Changes.RegisterChargeOnFinalize do
  @moduledoc """
  Ao finalizar um atendimento, registra a cobrança: soma o serviço principal
  com os itens adicionais e cria (ou atualiza) a transação financeira do
  agendamento como paga, na forma de pagamento informada.

  Roda com `authorize?: false` para que o profissional consiga finalizar o
  próprio atendimento sem precisar de permissão direta sobre Transaction.

  A guarda de status (só finaliza a partir de :em_atendimento) fica no
  state machine do Appointment — esta change só cuida da cobrança.
  """

  use Ash.Resource.Change

  require Ash.Query

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.after_action(changeset, &register_charge/2)
  end

  def sync_completed!(id) do
    appointment =
      Ash.get!(LabelleBack.Studio.Appointment, id, authorize?: false)
      |> Ash.Changeset.for_update(:refresh_totals, %{}, authorize?: false)
      |> Ash.update!()

    {:ok, appointment} = register_charge(nil, appointment)
    appointment
  end

  defp register_charge(changeset, appointment) do
    items =
      LabelleBack.Studio.AppointmentService
      |> Ash.Query.filter(appointment_id == ^appointment.id)
      |> Ash.read!(authorize?: false)

    total =
      Enum.reduce(items, appointment.price || Decimal.new(0), fn item, acc ->
        Decimal.add(acc, item.price || Decimal.new(0))
      end)

    total = Decimal.add(total, appointment.tip_amount || Decimal.new(0))

    service_names =
      [appointment.service_name | Enum.map(items, & &1.service_name)]
      |> Enum.reject(&is_nil/1)
      |> Enum.join(" + ")

    attrs = %{
      type: :entrada,
      category: :servico,
      description: "#{service_names} – #{appointment.client_name}",
      amount: total,
      date: appointment.date,
      payment_method: appointment.payment_method,
      status: :pago,
      appointment_id: appointment.id,
      professional_id: appointment.professional_id,
      client_id: appointment.client_id
    }

    existing =
      LabelleBack.Studio.Transaction
      |> Ash.Query.filter(
        appointment_id == ^appointment.id and type == :entrada and category == :servico
      )
      |> Ash.Query.limit(1)
      |> Ash.read!(authorize?: false)

    case existing do
      [transaction | _] ->
        transaction
        |> Ash.Changeset.for_update(
          :update,
          Map.drop(
            attrs,
            if(is_nil(changeset), do: [:appointment_id, :status], else: [:appointment_id])
          ),
          authorize?: false
        )
        |> Ash.update!()

      [] when is_nil(changeset) ->
        :ok

      [] ->
        LabelleBack.Studio.Transaction
        |> Ash.Changeset.for_create(:create, attrs, authorize?: false)
        |> Ash.create!()
    end

    {:ok, appointment}
  end
end
