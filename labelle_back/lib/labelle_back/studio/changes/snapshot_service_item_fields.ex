defmodule LabelleBack.Studio.Changes.SnapshotServiceItemFields do
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &LabelleBack.Studio.Changes.CatalogSnapshot.apply/1)
  end
end
