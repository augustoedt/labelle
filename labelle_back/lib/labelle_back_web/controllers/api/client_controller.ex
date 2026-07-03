defmodule LabelleBackWeb.Api.ClientController do
  use LabelleBackWeb, :controller

  require Ash.Query

  alias LabelleBack.Studio

  @doc "POST /api/client/available_slots"
  def available_slots(conn, params) do
    professional_id = params["professional_id"]
    date = params["date"]
    duration = params["duration_minutes"] || 60
    work_start = params["work_start"] || "09:00"
    work_end = params["work_end"] || "18:00"

    if is_nil(professional_id) or is_nil(date) do
      conn
      |> put_status(:bad_request)
      |> json(%{error: "professional_id e date são obrigatórios"})
    else
      {:ok, parsed_date} = Date.from_iso8601(date)

      booked =
        Studio.Appointment
        |> Ash.Query.filter(professional_id == ^professional_id and date == ^parsed_date)
        |> Ash.Query.filter(status != :cancelado)
        |> Ash.read!(authorize?: false)

      slots = compute_slots(booked, duration, work_start, work_end)

      json(conn, %{slots: slots})
    end
  end

  @doc "POST /api/client/appointments"
  def appointments(conn, %{"phone" => phone}) do
    phone_norm = normalize_phone(phone)

    appointments =
      Studio.Appointment
      |> Ash.Query.sort(date: :desc)
      |> Ash.Query.limit(200)
      |> Ash.read!(authorize?: false)
      |> Enum.filter(fn appt ->
        normalize_phone(appt.client_phone || "") == phone_norm
      end)
      |> Enum.map(&appointment_json/1)

    json(conn, %{appointments: appointments})
  end

  @doc "POST /api/client/loyalty"
  def loyalty(conn, %{"phone" => phone}) do
    phone_norm = normalize_phone(phone)

    client =
      Studio.Client
      |> Ash.Query.filter(phone_normalized == ^phone_norm)
      |> Ash.read_one!(authorize?: false)

    if client do
      json(conn, %{
        client: %{
          id: client.id,
          name: client.name,
          loyalty_tier: client.loyalty_tier,
          loyalty_points: client.loyalty_points,
          visit_count: client.visit_count,
          total_spent: decimal_to_number(client.total_spent)
        }
      })
    else
      json(conn, %{client: nil})
    end
  end

  @doc "POST /api/client/upsert"
  def upsert(conn, %{"name" => name, "phone" => phone}) do
    phone_norm = normalize_phone(phone)

    if String.length(phone_norm) < 10 do
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Telefone inválido"})
    else
      existing =
        Studio.Client
        |> Ash.Query.filter(phone_normalized == ^phone_norm)
        |> Ash.read_one!(authorize?: false)

      today = Date.utc_today()

      client =
        if existing do
          existing
          |> Ash.Changeset.for_update(
            :update,
            %{
              name: String.trim(name),
              visit_count: (existing.visit_count || 0) + 1,
              last_appointment_date: today
            },
            authorize?: false
          )
          |> Ash.update!()
        else
          Studio.Client
          |> Ash.Changeset.for_create(
            :create,
            %{
              name: String.trim(name),
              phone: phone,
              is_active: true,
              source: :app_cliente,
              first_appointment_date: today,
              last_appointment_date: today
            },
            authorize?: false
          )
          |> Ash.create!()
        end

      json(conn, %{client_id: client.id})
    end
  end

  defp appointment_json(appt) do
    %{
      id: appt.id,
      service_name: appt.service_name,
      professional_name: appt.professional_name,
      date: appt.date,
      time: appt.time,
      status: appt.status,
      price: decimal_to_number(appt.price)
    }
  end

  defp decimal_to_number(nil), do: nil
  defp decimal_to_number(%Decimal{} = d), do: Decimal.to_float(d)
  defp decimal_to_number(n), do: n

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
    # Accepts "HH:MM" as well as the "HH:MM:SS" ISO8601 format that our
    # Professional.work_start/work_end (:time attributes) actually serialize
    # to via AshJsonApi — only the first two segments matter here.
    [h, m | _] = String.split(str, ":") |> Enum.map(&String.to_integer/1)
    {h, m}
  end

  defp format_hhmm(minutes) do
    h = div(minutes, 60)
    m = rem(minutes, 60)
    :io_lib.format("~2..0B:~2..0B", [h, m]) |> to_string()
  end

  defp normalize_phone(phone) do
    phone
    |> to_string()
    |> String.replace(~r/\D/, "")
    |> then(fn digits ->
      if String.starts_with?(digits, "55") and String.length(digits) >= 12 do
        String.slice(digits, 2..-1//1)
      else
        digits
      end
    end)
  end
end
