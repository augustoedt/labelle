defmodule LabelleBack.Studio.Checks.ActorIsServiceItemProfessional do
  @moduledoc """
  Autoriza quando o actor é a profissional dona do atendimento ao qual o
  item de serviço (`AppointmentService`) está sendo adicionado. Usado na
  action de create, onde filter checks não conseguem resolver o
  relacionamento `appointment.professional` — o item ainda não existe.
  """

  use Ash.Policy.SimpleCheck

  @impl true
  def describe(_opts), do: "actor é a profissional dona do atendimento do item"

  @impl true
  def match?(nil, _context, _opts), do: false

  def match?(actor, %{changeset: %Ash.Changeset{} = changeset}, _opts) do
    with appointment_id when not is_nil(appointment_id) <-
           Ash.Changeset.get_attribute(changeset, :appointment_id),
         {:ok, appointment} <-
           Ash.get(LabelleBack.Studio.Appointment, appointment_id,
             authorize?: false,
             load: :professional
           ),
         professional when not is_nil(professional.user_id) <- appointment.professional do
      professional.user_id == actor.id
    else
      _ -> false
    end
  end

  def match?(_actor, _context, _opts), do: false
end
