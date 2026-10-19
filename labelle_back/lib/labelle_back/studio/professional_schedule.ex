defmodule LabelleBack.Studio.ProfessionalSchedule do
  @moduledoc "Agenda por serviço executado, inclusive adicionais simultâneos."
  require Ash.Query
  alias LabelleBack.Studio.{Appointment, AppointmentService}

  def bookings(professional_id, date) do
    principal =
      Appointment
      |> Ash.Query.filter(
        professional_id == ^professional_id and date == ^date and status != :cancelado
      )
      |> Ash.read!(authorize?: false)
      |> Enum.map(
        &%{
          appointment_id: &1.id,
          client_id: &1.client_id,
          time: &1.time,
          duration_minutes: &1.duration_minutes || 60
        }
      )

    additional =
      AppointmentService
      |> Ash.Query.filter(
        professional_id == ^professional_id and appointment.date == ^date and
          appointment.status != :cancelado
      )
      |> Ash.read!(authorize?: false, load: :appointment)
      |> Enum.map(
        &%{
          appointment_id: &1.appointment_id,
          client_id: &1.appointment.client_id,
          time: &1.appointment.time,
          duration_minutes: &1.duration_minutes || 60
        }
      )

    principal ++ additional
  end

  def conflict?(professional_id, date, time, duration, exclude_appointment_id, client_id \\ nil) do
    start = minutes(time)

    bookings(professional_id, date)
    |> Enum.any?(fn booked ->
      booked.appointment_id != exclude_appointment_id &&
        (is_nil(client_id) || booked.client_id != client_id) &&
        start < minutes(booked.time) + booked.duration_minutes &&
        start + duration > minutes(booked.time)
    end)
  end

  defp minutes(time), do: time.hour * 60 + time.minute
end
