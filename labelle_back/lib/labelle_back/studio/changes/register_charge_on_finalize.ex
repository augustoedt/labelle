defmodule LabelleBack.Studio.Changes.RegisterChargeOnFinalize do
  @moduledoc """
  Registra a cobrança completa e seu estado pago, parcial ou pendente.
  Recebimentos parciais ficam no histórico de pagamentos, separados da dívida.

  Roda com `authorize?: false` para que o profissional consiga finalizar o
  próprio atendimento sem precisar de permissão direta sobre Transaction.

  A guarda de status (só finaliza a partir de :em_atendimento) fica no
  state machine do Appointment — esta change só cuida da cobrança.
  """

  use Ash.Resource.Change

  require Ash.Query

  @impl true
  def change(changeset, _opts, _context) do
    changeset
    |> Ash.Changeset.before_action(fn cs ->
      total = LabelleBack.Studio.Receivables.total(struct(cs.data, cs.attributes))
      status = Ash.Changeset.get_argument(cs, :payment_status)
      paid = Ash.Changeset.get_argument(cs, :amount_paid)
      paid = if paid, do: Decimal.round(paid, 2), else: nil

      cond do
        status != :pendente_confirmacao &&
            is_nil(Ash.Changeset.get_attribute(cs, :payment_method)) ->
          Ash.Changeset.add_error(cs,
            field: :payment_method,
            message: "informe a forma de pagamento"
          )

        status == :pagamento_parcial &&
            (is_nil(paid) || Decimal.compare(paid, 0) != :gt ||
               Decimal.compare(paid, total) != :lt) ->
          Ash.Changeset.add_error(cs,
            field: :amount_paid,
            message: "informe um valor maior que zero e menor que o total"
          )

        status == :pendente_confirmacao && paid && !Decimal.equal?(paid, 0) ->
          Ash.Changeset.add_error(cs,
            field: :amount_paid,
            message: "pagamento pendente não pode ter valor recebido"
          )

        true ->
          cs
      end
    end)
    |> Ash.Changeset.after_action(&register_charge/2)
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
      payment_method: appointment.payment_method || :a_definir,
      status:
        if(changeset, do: Ash.Changeset.get_argument(changeset, :payment_status), else: :pago),
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
        receipts = LabelleBack.Studio.Receivables.payments(transaction.id)

        attrs =
          if is_nil(changeset) && receipts != [] &&
               transaction.status not in [:cancelado, :estornado] do
            paid = LabelleBack.Studio.Receivables.sum(receipts)

            Map.put(
              attrs,
              :status,
              if(Decimal.compare(paid, total) == :lt, do: :pagamento_parcial, else: :pago)
            )
          else
            attrs
          end

        transaction
        |> Ash.Changeset.for_update(
          :update,
          Map.drop(
            attrs,
            if(
              is_nil(changeset) &&
                (receipts == [] || transaction.status in [:cancelado, :estornado]),
              do: [:appointment_id, :status],
              else: [:appointment_id]
            )
          ),
          authorize?: false
        )
        |> Ash.update!()

      [] when is_nil(changeset) ->
        :ok

      [] ->
        transaction =
          LabelleBack.Studio.Transaction
          |> Ash.Changeset.for_create(:create, attrs, authorize?: false)
          |> Ash.create!()

        if attrs.status == :pagamento_parcial do
          LabelleBack.Studio.Payment
          |> Ash.Changeset.for_create(
            :create,
            %{
              transaction_id: transaction.id,
              appointment_id: appointment.id,
              client_id: appointment.client_id,
              professional_id: appointment.professional_id,
              payment_date: LabelleBack.Studio.Receivables.today(),
              payment_method: appointment.payment_method,
              amount: Decimal.round(Ash.Changeset.get_argument(changeset, :amount_paid), 2),
              status: :confirmado
            },
            authorize?: false
          )
          |> Ash.create!()
        end
    end

    {:ok, appointment}
  end
end
