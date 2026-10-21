defmodule LabelleBack.Studio.Changes.ResolveManualBookingClient do
  @moduledoc """
  Resolve o cadastro de agendamentos feitos pela equipe. A seleção explícita
  usa somente o ID; a entrada direta usa o telefone completo e exato. Sem
  telefone nem seleção, o agendamento continua permitido sem vínculo.
  """
  use Ash.Resource.Change

  alias LabelleBack.Studio.{Client, Changes.NormalizePhone}

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &resolve/1)
  end

  defp resolve(%{valid?: false} = changeset), do: changeset

  defp resolve(changeset) do
    case Ash.Changeset.get_attribute(changeset, :client_id) do
      nil -> resolve_phone(changeset)
      client_id -> resolve_selected(changeset, client_id)
    end
  end

  defp resolve_selected(changeset, client_id) do
    case Ash.get(Client, client_id, authorize?: false) do
      {:ok, %Client{} = client} ->
        supplied = Ash.Changeset.get_attribute(changeset, :client_phone)

        if supplied in [nil, ""] or
             NormalizePhone.normalize(supplied) == NormalizePhone.normalize(client.phone) do
          attach(changeset, client)
        else
          Ash.Changeset.add_error(changeset,
            field: :client_phone,
            message: "o telefone não corresponde à cliente selecionada"
          )
        end

      _ ->
        Ash.Changeset.add_error(changeset, field: :client_id, message: "cliente não encontrada")
    end
  end

  defp resolve_phone(changeset) do
    phone = Ash.Changeset.get_attribute(changeset, :client_phone) || ""
    normalized = NormalizePhone.normalize(phone)

    cond do
      String.trim(phone) == "" ->
        changeset

      String.length(normalized) not in [12, 13] or
          String.starts_with?(normalized, "5500") ->
        Ash.Changeset.add_error(changeset,
          field: :client_phone,
          message: "informe telefone completo com DDD (10 ou 11 dígitos)"
        )

      true ->
        with {:ok, client} <-
               LabelleBack.Studio.get_client_by_phone_normalized(normalized, authorize?: false),
             {:ok, client} <- create_if_missing(client, changeset, phone) do
          attach(changeset, client)
        else
          {:error, error} -> Ash.Changeset.add_error(changeset, error)
        end
    end
  end

  defp create_if_missing(%Client{} = client, _changeset, _phone), do: {:ok, client}

  defp create_if_missing(nil, changeset, phone) do
    name = Ash.Changeset.get_attribute(changeset, :client_name) |> to_string() |> String.trim()

    if name == "" do
      {:error, [field: :client_name, message: "informe o nome da nova cliente"]}
    else
      Client
      |> Ash.Changeset.for_create(
        :create,
        %{name: name, phone: phone, source: :atendimento},
        authorize?: false
      )
      |> Ash.create(upsert?: true, upsert_identity: :unique_phone_normalized, upsert_fields: [])
    end
  end

  defp attach(changeset, client) do
    changeset
    |> Ash.Changeset.force_change_attribute(:client_id, client.id)
    |> Ash.Changeset.force_change_attribute(:client_name, client.name)
    |> Ash.Changeset.force_change_attribute(:client_phone, client.phone)
  end
end
