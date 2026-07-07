defmodule LabelleBack.Studio.Changes.SendWhatsAppMessage do
  @moduledoc """
  Envia, após o update ter sucesso, a mensagem de confirmação ou lembrete de
  horário para o cliente a partir do WhatsApp da empresa. Uma falha de envio
  não derruba o update do agendamento — só fica registrada em log, do mesmo
  jeito que `Reminders.DeliverPending` trata falhas do job de 20/45 dias.
  """

  use Ash.Resource.Change

  require Logger

  alias LabelleBack.Messaging.WhatsApp
  alias LabelleBack.Studio.Messaging.Templates

  @impl true
  def change(changeset, opts, _context) do
    Ash.Changeset.after_action(changeset, fn _changeset, appointment ->
      send_message(appointment, Keyword.fetch!(opts, :kind))
      {:ok, appointment}
    end)
  end

  defp send_message(appointment, kind) do
    with phone when is_binary(phone) and phone != "" <- appointment.client_phone,
         {:ok, text} <- Templates.render(kind, appointment) do
      case WhatsApp.send_message(phone, text) do
        {:ok, _id} ->
          :ok

        {:error, reason} ->
          Logger.warning(
            "Falha ao enviar WhatsApp (#{kind}) para agendamento #{appointment.id}: #{inspect(reason)}"
          )
      end
    end
  end
end
