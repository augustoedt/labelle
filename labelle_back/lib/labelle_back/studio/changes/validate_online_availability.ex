defmodule LabelleBack.Studio.Changes.ValidateOnlineAvailability do
  use Ash.Resource.Change
  require Ash.Query
  alias LabelleBack.Studio.{Appointment, Professional, ProfessionalService}

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &validate_booking/1)
  end

  defp validate_booking(%{valid?: false} = changeset), do: changeset

  defp validate_booking(changeset) do
    professional_id = Ash.Changeset.get_attribute(changeset, :professional_id)
    date = Ash.Changeset.get_attribute(changeset, :date)
    time = Ash.Changeset.get_attribute(changeset, :time)
    duration = Ash.Changeset.get_attribute(changeset, :duration_minutes)
    # before_action executes within the creation transaction. Concurrent
    # online requests for the same professional/day check availability serially.
    Ecto.Adapters.SQL.query!(
      LabelleBack.Repo,
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      ["#{professional_id}:#{date}"]
    )

    with {:ok, %Professional{is_active: true} = professional} <-
           Ash.get(Professional, professional_id, authorize?: false),
         true <- valid_time?(professional, date, time, duration),
         false <- conflict?(professional_id, date, time, duration),
         true <- qualified?(changeset, professional_id) do
      changeset
    else
      _ ->
        Ash.Changeset.add_error(changeset,
          field: :time,
          message: "horário indisponível para este serviço e profissional"
        )
    end
  end

  defp valid_time?(professional, date, time, duration) do
    # The studio is in João Pessoa (UTC−03 throughout the year).
    now = DateTime.utc_now() |> DateTime.add(-3 * 3600) |> DateTime.to_naive()
    start = NaiveDateTime.new!(date, time)
    work_start = professional.work_start || ~T[09:00:00]
    work_end = professional.work_end || ~T[18:00:00]
    day = rem(Date.day_of_week(date), 7)

    (is_nil(professional.work_days) or professional.work_days == [] or
       day in professional.work_days) and
      NaiveDateTime.compare(start, now) == :gt and duration > 0 and
      minutes(time) >= minutes(work_start) and minutes(time) + duration <= minutes(work_end)
  end

  defp conflict?(professional_id, date, time, duration) do
    start = minutes(time)

    Appointment
    |> Ash.Query.filter(
      professional_id == ^professional_id and date == ^date and status != :cancelado
    )
    |> Ash.read!(authorize?: false)
    |> Enum.any?(fn appointment ->
      existing = minutes(appointment.time)
      start < existing + (appointment.duration_minutes || 60) and start + duration > existing
    end)
  end

  # Existing unvarianted bookings keep their legacy professional rules.
  defp qualified?(changeset, professional_id) do
    if Ash.Changeset.get_attribute(changeset, :service_variant_id) do
      service_id = Ash.Changeset.get_attribute(changeset, :service_id)

      ProfessionalService
      |> Ash.Query.filter(professional_id == ^professional_id and service_id == ^service_id)
      |> Ash.exists?(authorize?: false)
    else
      true
    end
  end

  defp minutes(time), do: time.hour * 60 + time.minute
end
