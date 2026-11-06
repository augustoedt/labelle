defmodule LabelleBack.Studio.Reminders.AppointmentReminder do
  @moduledoc "Lembrete automático de horário, único por agendamento/data/hora."
  use Oban.Worker,
    queue: :reminders,
    max_attempts: 10,
    unique: [period: :infinity, fields: [:worker, :args], states: :all]

  import Ecto.Query, only: [from: 2]
  alias LabelleBack.Repo
  alias LabelleBack.Studio.{Appointment, Client}
  alias LabelleBack.Messaging.WhatsApp
  alias LabelleBack.Studio.Messaging.Templates

  # Os horários do salão são locais de São Paulo (UTC-3, sem horário de verão).
  def starts_at(date, time) do
    DateTime.new!(date, time, "Etc/UTC") |> DateTime.add(3 * 3600, :second)
  end

  def local_date(now), do: now |> DateTime.add(-3 * 3600, :second) |> DateTime.to_date()

  def valid_phone?(phone) do
    phone = LabelleBack.Studio.Changes.NormalizePhone.normalize(phone || "")
    is_binary(phone) and String.starts_with?(phone, "55") and String.length(phone) in [12, 13]
  end

  @impl Oban.Worker
  def perform(%Oban.Job{id: id, args: args}) do
    now = DateTime.utc_now()

    case deliver(args, now) do
      {:ok, :sent} ->
        Repo.update_all(from(j in Oban.Job, where: j.id == ^id),
          set: [meta: %{"outcome" => "sent", "sent_at" => DateTime.to_iso8601(now)}]
        )

        :ok

      result ->
        result
    end
  end

  def deliver(args, now) do
    case Ash.get(Appointment, args["appointment_id"], authorize?: false) do
      {:ok, appointment} -> deliver_current(appointment, args, now)
      {:error, %Ash.Error.Invalid{}} -> :ok
      {:error, error} -> {:error, error}
    end
  end

  defp deliver_current(appointment, args, now) do
    starts = starts_at(appointment.date, appointment.time)
    due = DateTime.add(starts, -2 * 3600, :second)

    eligible =
      appointment.status in [:agendado, :confirmado] and
        Date.to_iso8601(appointment.date) == args["date"] and
        Time.to_iso8601(appointment.time) == args["time"] and
        DateTime.compare(now, starts) == :lt

    cond do
      not eligible -> :ok
      DateTime.compare(now, due) == :lt -> {:snooze, max(1, DateTime.diff(due, now))}
      true -> send_current(appointment)
    end
  end

  defp send_current(appointment) do
    client =
      if appointment.client_id, do: Ash.get!(Client, appointment.client_id, authorize?: false)

    phone = if client, do: client.phone, else: appointment.client_phone

    cond do
      client && client.is_active == false ->
        :ok

      not valid_phone?(phone) ->
        :ok

      not WhatsApp.configured?() ->
        {:error, :whatsapp_not_configured}

      true ->
        with {:ok, text} <- Templates.render(:reminder, appointment),
             {:ok, _id} <- WhatsApp.send_message(phone, text) do
          {:ok, :sent}
        end
    end
  end
end
