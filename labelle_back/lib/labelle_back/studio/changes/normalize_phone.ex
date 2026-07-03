defmodule LabelleBack.Studio.Changes.NormalizePhone do
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    case Ash.Changeset.get_attribute(changeset, :phone) do
      nil ->
        changeset

      phone ->
        normalized = String.replace(phone, ~r/\D/, "")
        Ash.Changeset.force_change_attribute(changeset, :phone_normalized, normalized)
    end
  end
end
