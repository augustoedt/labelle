defmodule LabelleBack.Studio.Changes.CatalogSnapshot do
  def apply(changeset) do
    service_id = Ash.Changeset.get_attribute(changeset, :service_id)
    variant_id = Ash.Changeset.get_attribute(changeset, :service_variant_id)
    service_changed? = Ash.Changeset.changing_attribute?(changeset, :service_id)
    variant_changed? = Ash.Changeset.changing_attribute?(changeset, :service_variant_id)

    # Lifecycle actions must preserve the price agreed when booking.
    if changeset.action_type == :create or service_changed? or variant_changed? do
      with {:ok, %{} = service} <-
             Ash.get(LabelleBack.Studio.Service, service_id, authorize?: false),
           {:ok, variant} <- selected_variant(service, variant_id, changeset.action.name) do
        source = variant || service
        name = if variant, do: "#{service.name} — #{variant.name}", else: service.name

        changeset
        |> Ash.Changeset.force_change_attribute(:service_name, name)
        |> Ash.Changeset.force_change_attribute(:variant_name, if(variant, do: variant.name))
        |> Ash.Changeset.force_change_attribute(:commission_percent, source.commission_percent)
        |> put_price(
          :duration_minutes,
          source.duration_minutes,
          not is_nil(variant) or (changeset.action_type == :update and service_changed?)
        )
        |> put_price(
          :price,
          source.price,
          not is_nil(variant) or (changeset.action_type == :update and service_changed?)
        )
      else
        {:error, message} when is_binary(message) ->
          Ash.Changeset.add_error(changeset, field: :service_variant_id, message: message)

        _ ->
          Ash.Changeset.add_error(changeset,
            field: :service_id,
            message: "serviço não encontrado"
          )
      end
    else
      changeset
    end
  end

  defp selected_variant(service, nil, action) do
    require Ash.Query

    variants =
      LabelleBack.Studio.ServiceVariant
      |> Ash.Query.filter(service_id == ^service.id)
      |> Ash.read!(authorize?: false)

    cond do
      action == :book_online and not service.is_active -> {:error, "serviço indisponível"}
      variants != [] -> {:error, "escolha uma opção do serviço"}
      true -> {:ok, nil}
    end
  end

  defp selected_variant(service, id, _action) do
    case Ash.get(LabelleBack.Studio.ServiceVariant, id, authorize?: false) do
      {:ok, %{service_id: service_id, is_active: true} = variant}
      when service_id == service.id and service.is_active ->
        {:ok, variant}

      _ ->
        {:error, "opção indisponível para este serviço"}
    end
  end

  defp put_price(changeset, attribute, value, replace?) do
    if replace? or is_nil(Ash.Changeset.get_attribute(changeset, attribute)) do
      Ash.Changeset.force_change_attribute(changeset, attribute, value)
    else
      changeset
    end
  end
end
