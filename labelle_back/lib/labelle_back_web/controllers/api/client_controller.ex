defmodule LabelleBackWeb.Api.ClientController do
  @moduledoc """
  Endpoints públicos do app da cliente (sem login). Camada fina: valida
  params da requisição e delega TODA a lógica ao domínio `Studio` via code
  interfaces — os `authorize?: false` são necessários porque não há actor
  nessas rotas, mas nenhuma regra de negócio vive mais aqui.
  """
  use LabelleBackWeb, :controller

  alias LabelleBack.Studio
  alias LabelleBack.Studio.Changes.NormalizePhone
  alias LabelleBack.Studio.Settings

  @doc "POST /api/client/available_slots"
  def available_slots(conn, params) do
    with professional_id when not is_nil(professional_id) <- params["professional_id"],
         date when not is_nil(date) <- params["date"],
         {:ok, parsed_date} <- Date.from_iso8601(date) do
      extra =
        %{}
        |> maybe_put(:duration_minutes, params["duration_minutes"])
        |> maybe_put(:work_start, params["work_start"])
        |> maybe_put(:work_end, params["work_end"])

      slots = Studio.available_slots!(professional_id, parsed_date, extra, authorize?: false)

      json(conn, %{slots: slots})
    else
      _ ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "professional_id e date (ISO8601) são obrigatórios"})
    end
  end

  @doc "POST /api/client/appointments"
  def appointments(conn, %{"phone" => phone}) do
    appointments =
      phone
      |> then(&Studio.list_appointments_by_client_phone!(&1, authorize?: false))
      |> Enum.map(&appointment_json/1)

    json(conn, %{appointments: appointments})
  end

  @doc "POST /api/client/loyalty"
  def loyalty(conn, %{"phone" => phone}) do
    case Studio.get_client_by_phone_normalized(NormalizePhone.normalize(phone), authorize?: false) do
      {:ok, nil} ->
        json(conn, %{client: nil})

      {:ok, client} ->
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
    end
  end

  @doc "POST /api/client/settings"
  def settings(conn, _params) do
    settings = Studio.current_settings!(authorize?: false)

    json(conn, %{
      name: settings.name,
      whatsapp_phone: settings.whatsapp_phone,
      address: Settings.format_address(settings),
      message_new_booking_notification: settings.message_new_booking_notification
    })
  end

  @doc "POST /api/client/upsert"
  def upsert(conn, %{"name" => name, "phone" => phone}) do
    if String.length(NormalizePhone.normalize(phone)) < 12 do
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Telefone inválido"})
    else
      client = Studio.upsert_client_from_booking!(name, phone, authorize?: false)
      json(conn, %{client_id: client.id})
    end
  end

  defp maybe_put(map, key, value) do
    if is_nil(value) or value == "", do: map, else: Map.put(map, key, value)
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
end
