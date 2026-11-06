defmodule LabelleBack.Studio.Reminders.DeliverPending do
  @moduledoc """
  Job diário que tenta enviar os lembretes pendentes pelo adapter de WhatsApp.

  Sem provedor configurado (adapter padrão `NotConfigured`) não faz nada — os
  lembretes continuam pendentes para envio manual pela equipe. Quando um
  provedor for integrado, este job passa a enviá-los sozinho.
  """

  use Ash.Resource.Actions.Implementation

  require Ash.Query
  require Logger

  alias LabelleBack.Messaging.WhatsApp
  alias LabelleBack.Studio.{ClientReminder, Client, Appointment}
  alias LabelleBack.Studio.Reminders.{AppointmentReminder, GenerateDue}

  @impl true
  def run(_input, _opts, _context) do
    if WhatsApp.configured?() do
      deliver_all()
    else
      Logger.info(
        "client_reminders: adapter de WhatsApp não configurado; lembretes aguardam envio manual"
      )

      {:ok, 0}
    end
  end

  defp deliver_all do
    sent =
      ClientReminder
      |> Ash.Query.filter(
        status in [:pendente, :falhou] and
          due_date <= ^AppointmentReminder.local_date(DateTime.utc_now())
      )
      |> Ash.read!(authorize?: false)
      |> Enum.count(&deliver/1)

    {:ok, sent}
  end

  defp deliver(reminder) do
    today = AppointmentReminder.local_date(DateTime.utc_now())
    client = Ash.get!(Client, reminder.client_id, authorize?: false)

    appointments =
      Appointment |> Ash.Query.filter(client_id == ^client.id) |> Ash.read!(authorize?: false)

    last_done =
      appointments
      |> Enum.filter(&(&1.status == :concluido))
      |> Enum.map(& &1.date)
      |> Enum.max(Date, fn -> nil end)

    open =
      Enum.any?(
        appointments,
        &(&1.status in [:agendado, :confirmado, :em_atendimento] and
            Date.compare(&1.date, today) != :lt)
      )

    valid =
      client.is_active && AppointmentReminder.valid_phone?(client.phone) && last_done &&
        not open && Date.compare(reminder.due_date, last_done) != :lt &&
        GenerateDue.kind_for(last_done, today) == reminder.kind

    if valid do
      send_reminder(reminder, client.phone)
    else
      reminder |> Ash.Changeset.for_update(:cancel, %{}, authorize?: false) |> Ash.update!()
      false
    end
  end

  defp send_reminder(reminder, phone) do
    case WhatsApp.send_message(phone, reminder.message) do
      {:ok, _external_id} ->
        reminder
        |> Ash.Changeset.for_update(:mark_sent, %{sent_via: :automatico}, authorize?: false)
        |> Ash.update!()

        true

      {:error, reason} ->
        reason = safe_reason(reason)
        Logger.warning("client_reminders: falha ao enviar lembrete #{reminder.id}: #{reason}")

        reminder
        |> Ash.Changeset.for_update(:mark_failed, %{reason: reason}, authorize?: false)
        |> Ash.update!()

        false
    end
  end

  defp safe_reason({:waha_http_error, status, _body}), do: "WAHA HTTP #{status}"
  defp safe_reason(reason), do: inspect(reason, limit: 10, printable_limit: 160)
end
