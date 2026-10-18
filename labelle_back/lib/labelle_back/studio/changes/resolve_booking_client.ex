defmodule LabelleBack.Studio.Changes.ResolveBookingClient do
  use Ash.Resource.Change
  alias LabelleBack.Studio.{Client, Changes.NormalizePhone}

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &resolve_client/1)
  end

  defp resolve_client(%{valid?: false} = changeset), do: changeset

  defp resolve_client(changeset) do
    phone = Ash.Changeset.get_attribute(changeset, :client_phone) || ""
    name = Ash.Changeset.get_attribute(changeset, :client_name) || ""
    normalized = NormalizePhone.normalize(phone)

    if String.length(normalized) in [12, 13] and String.trim(name) != "" do
      with {:ok, client} <-
             LabelleBack.Studio.get_client_by_phone_normalized(normalized, authorize?: false),
           {:ok, client} <- create_if_missing(client, name, phone) do
        Ash.Changeset.force_change_attribute(changeset, :client_id, client.id)
      else
        {:error, error} -> Ash.Changeset.add_error(changeset, error)
      end
    else
      Ash.Changeset.add_error(changeset,
        field: :client_phone,
        message: "informe nome e telefone com DDD válidos"
      )
    end
  end

  defp create_if_missing(nil, name, phone) do
    Client
    |> Ash.Changeset.for_create(
      :create,
      %{name: String.trim(name), phone: phone, source: :app_cliente, is_active: true},
      authorize?: false
    )
    |> Ash.create(upsert?: true, upsert_identity: :unique_phone_normalized, upsert_fields: [])
  end

  defp create_if_missing(client, _name, _phone), do: {:ok, client}
end
