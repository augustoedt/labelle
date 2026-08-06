defmodule LabelleBack.Studio.Checks.ActorIsAppointmentProfessional do
  @moduledoc """
  Autoriza quando o actor é a profissional dona do agendamento sendo
  criado (`professional_id` no changeset aponta para uma profissional
  cujo `user_id` é o do actor). Usado em actions de create, onde filter
  checks (`expr(professional.user_id == ...)`) não conseguem resolver
  relacionamentos — o registro ainda não existe no banco.
  """

  use Ash.Policy.SimpleCheck

  @impl true
  def describe(_opts), do: "actor é a profissional dona do agendamento"

  @impl true
  def match?(nil, _context, _opts), do: false

  def match?(actor, %{changeset: %Ash.Changeset{} = changeset}, _opts) do
    with professional_id when not is_nil(professional_id) <-
           Ash.Changeset.get_attribute(changeset, :professional_id),
         {:ok, professional} <-
           Ash.get(LabelleBack.Studio.Professional, professional_id, authorize?: false) do
      professional.user_id == actor.id
    else
      _ -> false
    end
  end

  def match?(_actor, _context, _opts), do: false
end
