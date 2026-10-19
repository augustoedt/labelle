defmodule LabelleBack.Studio.Changes.AssignServiceItemProfessional do
  use Ash.Resource.Change
  require Ash.Query
  alias LabelleBack.Studio.{Appointment, Professional, ProfessionalService, ProfessionalSchedule}
  @impl true
  def change(changeset, _opts, _context) do
    changeset =
      if is_nil(Ash.Changeset.get_attribute(changeset, :professional_id)) do
        case Ash.get(Appointment, Ash.Changeset.get_attribute(changeset, :appointment_id),
               authorize?: false
             ) do
          {:ok, appointment} when not is_nil(appointment) ->
            Ash.Changeset.force_change_attribute(
              changeset,
              :professional_id,
              appointment.professional_id
            )

          _ ->
            changeset
        end
      else
        changeset
      end

    Ash.Changeset.before_action(changeset, fn cs ->
      appointment =
        Ash.get!(Appointment, Ash.Changeset.get_attribute(cs, :appointment_id), authorize?: false)

      id = Ash.Changeset.get_attribute(cs, :professional_id) || appointment.professional_id
      professional = Ash.get!(Professional, id, authorize?: false)

      explicit_change? =
        cs.action_type == :create || Ash.Changeset.changing_attribute?(cs, :professional_id) ||
          Ash.Changeset.changing_attribute?(cs, :service_id)

      qualified? =
        id == appointment.professional_id ||
          ProfessionalService
          |> Ash.Query.filter(
            professional_id == ^id and service_id == ^Ash.Changeset.get_attribute(cs, :service_id)
          )
          |> Ash.exists?(authorize?: false)

      cond do
        explicit_change? && (!professional.is_active || !qualified?) ->
          Ash.Changeset.add_error(cs,
            field: :professional_id,
            message: "selecione uma profissional ativa vinculada ao serviço"
          )

        true ->
          cs =
            cs
            |> Ash.Changeset.force_change_attribute(:professional_id, id)
            |> Ash.Changeset.force_change_attribute(:professional_name, professional.name)

          if explicit_change? && id != appointment.professional_id &&
               appointment.status != :concluido do
            LabelleBack.Repo.query!("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
              "#{id}:#{appointment.date}"
            ])

            if ProfessionalSchedule.conflict?(
                 id,
                 appointment.date,
                 appointment.time,
                 Ash.Changeset.get_attribute(cs, :duration_minutes) || 60,
                 appointment.id,
                 appointment.client_id
               ) do
              Ash.Changeset.add_error(cs,
                field: :professional_id,
                message: "profissional ocupada com outra cliente nesse horário"
              )
            else
              cs
            end
          else
            cs
          end
      end
    end)
  end
end
