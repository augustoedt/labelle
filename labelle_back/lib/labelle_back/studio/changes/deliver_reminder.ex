defmodule LabelleBack.Studio.Changes.DeliverReminder do
  @moduledoc """
  Tenta enviar um lembrete específico pelo adapter de WhatsApp configurado,
  sob demanda — acionado pelo botão "Enviar WhatsApp" em Lembretes, fora do
  job diário `Reminders.DeliverPending`. Sem provedor configurado, ou se o
  envio falhar, retorna erro e o front cai de volta pro link wa.me manual.
  """

  use Ash.Resource.Change

  alias LabelleBack.Messaging.WhatsApp

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &deliver/1)
  end

  defp deliver(changeset) do
    reminder = changeset.data

    cond do
      not WhatsApp.configured?() ->
        Ash.Changeset.add_error(changeset, "WhatsApp da empresa não está conectado")

      true ->
        case WhatsApp.send_message(reminder.client_phone, reminder.message) do
          {:ok, _external_id} ->
            changeset
            |> Ash.Changeset.force_change_attribute(:status, :enviado)
            |> Ash.Changeset.force_change_attribute(:sent_via, :automatico)
            |> Ash.Changeset.force_change_attribute(:sent_at, DateTime.utc_now())

          {:error, reason} ->
            Ash.Changeset.add_error(changeset, "Falha ao enviar WhatsApp: #{inspect(reason)}")
        end
    end
  end
end
