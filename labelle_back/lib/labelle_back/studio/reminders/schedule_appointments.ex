defmodule LabelleBack.Studio.Reminders.ScheduleAppointments do
  @moduledoc "Procura horários devidos a cada minuto, com recuperação de até cinco minutos."
  use Oban.Worker, queue: :reminders, max_attempts: 3, unique: [period: 60]
  require Ash.Query
  alias LabelleBack.Studio.Appointment
  alias LabelleBack.Studio.Reminders.AppointmentReminder

  @impl Oban.Worker
  def perform(_job), do: schedule(DateTime.utc_now())

  def schedule(now) do
    today = AppointmentReminder.local_date(now)
    tomorrow = Date.add(today, 1)

    Appointment
    |> Ash.Query.filter(
      status in [:agendado, :confirmado] and date >= ^today and date <= ^tomorrow
    )
    |> Ash.read!(authorize?: false)
    |> Enum.each(fn appointment ->
      due =
        appointment
        |> then(&AppointmentReminder.starts_at(&1.date, &1.time))
        |> DateTime.add(-7200, :second)

      distance = DateTime.diff(due, now)

      if distance >= -300 and distance <= 60 do
        %{
          appointment_id: appointment.id,
          date: Date.to_iso8601(appointment.date),
          time: Time.to_iso8601(appointment.time)
        }
        |> AppointmentReminder.new(scheduled_at: due)
        |> Oban.insert!()
      end
    end)

    :ok
  end
end
