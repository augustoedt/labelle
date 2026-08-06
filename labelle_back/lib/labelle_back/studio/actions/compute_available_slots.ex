defmodule LabelleBack.Studio.Actions.ComputeAvailableSlots do
  @moduledoc """
  Calcula os horários livres de uma profissional numa data: grade de 30 em
  30 minutos dentro do expediente, menos os agendamentos não cancelados.

  O expediente vem de `work_start`/`work_end` da profissional, a menos que
  os argumentos explícitos sejam passados (o app da cliente manda os que já
  tem em tela — mesmo valor, evita um roundtrip).
  """
  use Ash.Resource.Actions.Implementation

  require Ash.Query

  alias LabelleBack.Studio.{Appointment, Professional}

  @impl true
  def run(input, _opts, _context) do
    args = input.arguments
    duration = args[:duration_minutes] || 60
    work_start = args[:work_start] || professional_time(args.professional_id, :work_start) || "09:00"
    work_end = args[:work_end] || professional_time(args.professional_id, :work_end) || "18:00"

    booked =
      Appointment
      |> Ash.Query.filter(professional_id == ^args.professional_id and date == ^args.date)
      |> Ash.Query.filter(status != :cancelado)
      |> Ash.read!(authorize?: false)

    {:ok, compute_slots(booked, duration, work_start, work_end)}
  end

  defp professional_time(professional_id, field) do
    with {:ok, professional} <- Ash.get(Professional, professional_id, authorize?: false),
         %Time{} = time <- Map.get(professional, field) do
      Calendar.strftime(time, "%H:%M")
    else
      _ -> nil
    end
  end

  defp compute_slots(booked, duration, work_start, work_end) do
    {start_h, start_m} = parse_hhmm(work_start)
    {end_h, end_m} = parse_hhmm(work_end)
    start_min = start_h * 60 + start_m
    end_min = end_h * 60 + end_m

    booked_ranges =
      Enum.map(booked, fn appt ->
        appt_start = appt.time.hour * 60 + appt.time.minute
        appt_end = appt_start + (appt.duration_minutes || 60)
        {appt_start, appt_end}
      end)

    start_min
    |> Stream.iterate(&(&1 + 30))
    |> Enum.take_while(&(&1 + duration <= end_min))
    |> Enum.reject(fn slot_start ->
      slot_end = slot_start + duration

      Enum.any?(booked_ranges, fn {b_start, b_end} ->
        slot_start < b_end and slot_end > b_start
      end)
    end)
    |> Enum.map(&format_hhmm/1)
  end

  defp parse_hhmm(str) do
    # Aceita "HH:MM" e também "HH:MM:SS" (formato que atributos :time
    # serializam) — só os dois primeiros segmentos importam.
    [h, m | _] = String.split(str, ":") |> Enum.map(&String.to_integer/1)
    {h, m}
  end

  defp format_hhmm(minutes) do
    h = div(minutes, 60)
    m = rem(minutes, 60)
    :io_lib.format("~2..0B:~2..0B", [h, m]) |> to_string()
  end
end
