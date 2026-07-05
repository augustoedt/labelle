defmodule LabelleBack.Studio.Reminders.GenerateDue do
  @moduledoc """
  Job diário que gera os lembretes devidos.

  Regra por cliente (ativo e com telefone), olhando o ciclo iniciado no
  último atendimento concluído:

  - cliente com novo agendamento em aberto → cancela pendentes e não gera nada;
  - nenhum lembrete no ciclo e 20+ dias desde o atendimento → `:agradecimento`;
  - último lembrete do ciclo enviado há 45+ dias sem novo serviço → `:reengajamento`;
  - lembrete pendente no ciclo → aguarda (não acumula).
  """

  use Ash.Resource.Actions.Implementation

  require Ash.Query

  alias LabelleBack.Studio.{Appointment, Client, ClientReminder}
  alias LabelleBack.Studio.Reminders.Messages

  @days_until_thanks 20
  @days_between_reengagements 45

  @impl true
  def run(_input, _opts, _context) do
    today = Date.utc_today()

    created =
      Client
      |> Ash.Query.filter(is_active == true and not is_nil(phone))
      |> Ash.read!(authorize?: false)
      |> Enum.count(&process_client(&1, today))

    {:ok, created}
  end

  defp process_client(client, today) do
    case last_concluded_date(client) do
      nil ->
        false

      last_done ->
        if rebooked?(client, today) do
          cancel_pending(client)
          false
        else
          maybe_create(client, last_done, today)
        end
    end
  end

  defp maybe_create(client, last_done, today) do
    case latest_reminder_in_cycle(client, last_done) do
      nil ->
        if Date.diff(today, last_done) >= @days_until_thanks do
          create_reminder(client, :agradecimento, today)
        else
          false
        end

      %{status: :pendente} ->
        false

      # :falhou conta como tentativa de contato — espera o próximo ciclo de
      # 45 dias em vez de gerar um lembrete novo por dia.
      latest ->
        last_contact = if latest.sent_at, do: DateTime.to_date(latest.sent_at), else: latest.due_date

        if Date.diff(today, last_contact) >= @days_between_reengagements do
          create_reminder(client, :reengajamento, today)
        else
          false
        end
    end
  end

  defp create_reminder(client, kind, today) do
    ClientReminder
    |> Ash.Changeset.for_create(
      :create,
      %{
        client_id: client.id,
        kind: kind,
        due_date: today,
        message: Messages.build(kind, client.name),
        client_name: client.name,
        client_phone: client.phone
      },
      authorize?: false
    )
    |> Ash.create!()

    true
  end

  defp last_concluded_date(client) do
    Appointment
    |> Ash.Query.filter(client_id == ^client.id and status == :concluido)
    |> Ash.Query.sort(date: :desc)
    |> Ash.Query.limit(1)
    |> Ash.read!(authorize?: false)
    |> case do
      [%{date: date} | _] -> date
      [] -> nil
    end
  end

  defp rebooked?(client, today) do
    Appointment
    |> Ash.Query.filter(
      client_id == ^client.id and
        status in [:agendado, :confirmado, :em_atendimento] and
        date >= ^today
    )
    |> Ash.Query.limit(1)
    |> Ash.read!(authorize?: false) != []
  end

  defp latest_reminder_in_cycle(client, last_done) do
    ClientReminder
    |> Ash.Query.filter(
      client_id == ^client.id and
        due_date >= ^last_done and
        status in [:pendente, :enviado, :falhou]
    )
    |> Ash.Query.sort(due_date: :desc, inserted_at: :desc)
    |> Ash.Query.limit(1)
    |> Ash.read!(authorize?: false)
    |> List.first()
  end

  defp cancel_pending(client) do
    ClientReminder
    |> Ash.Query.filter(client_id == ^client.id and status == :pendente)
    |> Ash.read!(authorize?: false)
    |> Enum.each(fn reminder ->
      reminder
      |> Ash.Changeset.for_update(:cancel, %{}, authorize?: false)
      |> Ash.update!()
    end)
  end
end
