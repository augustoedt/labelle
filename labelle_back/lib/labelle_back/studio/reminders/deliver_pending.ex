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
  alias LabelleBack.Studio.ClientReminder

  @impl true
  def run(_input, _opts, _context) do
    if WhatsApp.configured?() do
      deliver_all()
    else
      Logger.info("client_reminders: adapter de WhatsApp não configurado; lembretes aguardam envio manual")

      {:ok, 0}
    end
  end

  defp deliver_all do
    sent =
      ClientReminder
      |> Ash.Query.filter(status == :pendente and due_date <= ^Date.utc_today())
      |> Ash.read!(authorize?: false)
      |> Enum.count(&deliver/1)

    {:ok, sent}
  end

  defp deliver(reminder) do
    case WhatsApp.send_message(reminder.client_phone, reminder.message) do
      {:ok, _external_id} ->
        reminder
        |> Ash.Changeset.for_update(:mark_sent, %{sent_via: :automatico}, authorize?: false)
        |> Ash.update!()

        true

      {:error, reason} ->
        Logger.warning("client_reminders: falha ao enviar lembrete #{reminder.id}: #{inspect(reason)}")

        reminder
        |> Ash.Changeset.for_update(:mark_failed, %{reason: inspect(reason)}, authorize?: false)
        |> Ash.update!()

        false
    end
  end
end
