defmodule LabelleBack.Studio.Changes.SnapshotServiceItemFields do
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &snapshot_service/1)
  end

  defp snapshot_service(changeset) do
    with service_id when not is_nil(service_id) <-
           Ash.Changeset.get_attribute(changeset, :service_id),
         {:ok, service} <- Ash.get(LabelleBack.Studio.Service, service_id, authorize?: false) do
      changeset
      |> Ash.Changeset.force_change_attribute(:service_name, service.name)
      |> put_default(:duration_minutes, service.duration_minutes)
      |> put_default(:price, service.price)
    else
      _ -> changeset
    end
  end

  defp put_default(changeset, attribute, value) do
    if Ash.Changeset.get_attribute(changeset, attribute) do
      changeset
    else
      Ash.Changeset.force_change_attribute(changeset, attribute, value)
    end
  end
end
