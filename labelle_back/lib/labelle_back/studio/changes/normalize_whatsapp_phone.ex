defmodule LabelleBack.Studio.Changes.NormalizeWhatsappPhone do
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    case Ash.Changeset.get_attribute(changeset, :whatsapp_phone) do
      nil ->
        changeset

      phone ->
        normalized = String.replace(phone, ~r/\D/, "")
        Ash.Changeset.force_change_attribute(changeset, :whatsapp_phone, normalized)
    end
  end
end
