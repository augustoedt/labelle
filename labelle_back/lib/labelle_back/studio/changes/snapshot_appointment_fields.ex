defmodule LabelleBack.Studio.Changes.SnapshotAppointmentFields do
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    changeset
    |> Ash.Changeset.before_action(&snapshot_client/1)
    |> Ash.Changeset.before_action(&snapshot_professional/1)
    |> Ash.Changeset.before_action(&snapshot_service/1)
  end

  # O agendamento público resolve a cliente apenas pelo telefone informado;
  # nunca copiar dados de um client_id que tenha chegado antes dessa validação.
  defp snapshot_client(%{action: %{name: :book_online}} = changeset), do: changeset

  defp snapshot_client(changeset) do
    with client_id when not is_nil(client_id) <-
           Ash.Changeset.get_attribute(changeset, :client_id),
         nil <- Ash.Changeset.get_attribute(changeset, :client_phone),
         {:ok, client} <- Ash.get(LabelleBack.Studio.Client, client_id, authorize?: false) do
      Ash.Changeset.force_change_attribute(changeset, :client_phone, client.phone)
    else
      _ -> changeset
    end
  end

  defp snapshot_professional(changeset) do
    with professional_id when not is_nil(professional_id) <-
           Ash.Changeset.get_attribute(changeset, :professional_id),
         {:ok, professional} <-
           Ash.get(LabelleBack.Studio.Professional, professional_id, authorize?: false) do
      Ash.Changeset.force_change_attribute(changeset, :professional_name, professional.name)
    else
      _ -> changeset
    end
  end

  defp snapshot_service(changeset),
    do: LabelleBack.Studio.Changes.CatalogSnapshot.apply(changeset)
end
