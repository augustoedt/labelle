defmodule LabelleBack.Studio.Changes.LinkConfirmedClientAppointments do
  use Ash.Resource.Change
  alias LabelleBack.Studio.Appointment
  alias LabelleBack.Studio.Changes.NormalizePhone

  def change(changeset, _opts, context) do
    ids = Ash.Changeset.get_argument(changeset, :same_client_appointment_ids) || []

    Ash.Changeset.after_action(changeset, fn _, appointment ->
      Enum.reduce_while(Enum.uniq(ids), {:ok, appointment}, fn id, _ ->
        with {:ok, other} <- Ash.get(Appointment, id, actor: context.actor),
             true <- same_person_candidate?(appointment, other),
             {:ok, _} <-
               other
               |> Ash.Changeset.for_update(
                 :complete_phone,
                 %{client_phone: appointment.client_phone},
                 actor: context.actor
               )
               |> Ash.update() do
          {:cont, {:ok, appointment}}
        else
          _ ->
            {:halt,
             {:error,
              "Não foi possível associar todos os atendimentos. Confira nome, telefone e permissão de acesso."}}
        end
      end)
    end)
  end

  defp same_person_candidate?(_, nil), do: false

  defp same_person_candidate?(a, b) do
    name = fn value ->
      value |> to_string() |> String.trim() |> String.downcase() |> String.replace(~r/\s+/u, " ")
    end

    phone = NormalizePhone.normalize(b.client_phone || "")

    name.(a.client_name) != "" and name.(a.client_name) == name.(b.client_name) and
      (is_nil(b.client_id) or b.client_id == a.client_id) and
      (phone in ["", "55"] or phone == NormalizePhone.normalize(a.client_phone))
  end
end
