defmodule LabelleBack.Studio.Reminders.GenerateDue do
  @moduledoc """
  Job diário que gera os lembretes devidos.

  Regra por cliente (ativo e com telefone), olhando o ciclo iniciado no
  último atendimento concluído:

  - cliente com novo agendamento em aberto → cancela pendentes e não gera nada;
  - nenhum lembrete no ciclo e 20+ dias desde o atendimento → `:agradecimento`;
  - último lembrete do ciclo enviado há 45+ dias sem novo serviço → `:reengajamento`;
  - lembrete pendente no ciclo → aguarda (não acumula).

  Implementação em lote: 3 queries no total (clientes, agendamentos
  relevantes e lembretes em aberto/ciclo, agrupados por cliente em
  memória) em vez de 3-4 queries POR cliente.
  """

  use Ash.Resource.Actions.Implementation

  require Ash.Query

  alias LabelleBack.Studio.{Appointment, Client, ClientReminder}
  alias LabelleBack.Studio.Reminders.Messages

  @days_until_thanks 20
  @days_between_reengagements 45
  @open_statuses [:agendado, :confirmado, :em_atendimento]

  @impl true
  def run(_input, _opts, _context) do
    today = Date.utc_today()

    clients =
      Client
      |> Ash.Query.filter(is_active == true and not is_nil(phone))
      |> Ash.read!(authorize?: false)

    client_ids = Enum.map(clients, & &1.id)

    appointments_by_client =
      Appointment
      |> Ash.Query.filter(client_id in ^client_ids)
      |> Ash.Query.filter(status == :concluido or (status in ^@open_statuses and date >= ^today))
      |> Ash.read!(authorize?: false)
      |> Enum.group_by(& &1.client_id)

    reminders_by_client =
      ClientReminder
      |> Ash.Query.filter(client_id in ^client_ids and status in [:pendente, :enviado, :falhou])
      |> Ash.read!(authorize?: false)
      |> Enum.group_by(& &1.client_id)

    created =
      Enum.count(clients, fn client ->
        process_client(
          client,
          Map.get(appointments_by_client, client.id, []),
          Map.get(reminders_by_client, client.id, []),
          today
        )
      end)

    {:ok, created}
  end

  defp process_client(client, appointments, reminders, today) do
    case last_concluded_date(appointments) do
      nil ->
        false

      last_done ->
        if rebooked?(appointments, today) do
          cancel_pending(reminders)
          false
        else
          maybe_create(client, reminders, last_done, today)
        end
    end
  end

  defp maybe_create(client, reminders, last_done, today) do
    case latest_reminder_in_cycle(reminders, last_done) do
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

  defp last_concluded_date(appointments) do
    appointments
    |> Enum.filter(&(&1.status == :concluido))
    |> Enum.max_by(& &1.date, Date, fn -> nil end)
    |> case do
      nil -> nil
      appointment -> appointment.date
    end
  end

  defp rebooked?(appointments, today) do
    Enum.any?(appointments, fn appointment ->
      appointment.status in @open_statuses and Date.compare(appointment.date, today) != :lt
    end)
  end

  defp latest_reminder_in_cycle(reminders, last_done) do
    reminders
    |> Enum.filter(&(Date.compare(&1.due_date, last_done) != :lt))
    |> Enum.sort(fn a, b ->
      case Date.compare(a.due_date, b.due_date) do
        :eq -> DateTime.compare(a.inserted_at, b.inserted_at) == :gt
        :gt -> true
        :lt -> false
      end
    end)
    |> List.first()
  end

  defp cancel_pending(reminders) do
    reminders
    |> Enum.filter(&(&1.status == :pendente))
    |> Enum.each(fn reminder ->
      reminder
      |> Ash.Changeset.for_update(:cancel, %{}, authorize?: false)
      |> Ash.update!()
    end)
  end
end
