defmodule LabelleBack.Studio.Messaging.Templates do
  @moduledoc """
  Textos de confirmação e lembrete de horário enviados a partir do
  agendamento (`Appointment`), montados a partir dos templates
  configuráveis em `LabelleBack.Studio.Settings`.

  Irmão de `LabelleBack.Studio.Reminders.Messages`, que cobre um conjunto
  diferente de templates (agradecimento/reengajamento do job de 20/45 dias,
  só com placeholders `{{cliente}}`/`{{estudio}}`) — mantidos separados para
  não misturar as duas responsabilidades.
  """

  alias LabelleBack.Studio.Settings

  @weekdays ~w(segunda-feira terça-feira quarta-feira quinta-feira sexta-feira sábado domingo)
  @months ~w(janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro)

  def render(:confirmation, appointment) do
    settings = Settings.current!(authorize?: false)
    {:ok, render_template(settings.message_confirmation, settings, appointment)}
  end

  def render(:reminder, appointment) do
    settings = Settings.current!(authorize?: false)
    {:ok, render_template(settings.message_reminder, settings, appointment)}
  end

  def render(:new_booking_notification, appointment) do
    settings = Settings.current!(authorize?: false)
    {:ok, render_template(settings.message_new_booking_notification, settings, appointment)}
  end

  defp render_template(template, settings, appointment) do
    template
    |> String.replace("{{cliente}}", appointment.client_name || "")
    |> String.replace("{{estudio}}", settings.name || "")
    |> String.replace("{{servico}}", appointment.service_name || "")
    |> String.replace("{{profissional}}", appointment.professional_name || "")
    |> String.replace("{{data}}", format_date(appointment.date))
    |> String.replace("{{hora}}", format_time(appointment.time))
    |> String.replace("{{telefone_cliente}}", appointment.client_phone || "")
    |> String.replace("{{endereco}}", Settings.format_address(settings))
  end

  defp format_date(nil), do: ""

  defp format_date(%Date{} = date) do
    weekday = Enum.at(@weekdays, Date.day_of_week(date) - 1)
    month = Enum.at(@months, date.month - 1)
    "#{weekday}, #{pad(date.day)} de #{month}"
  end

  defp format_time(nil), do: ""
  defp format_time(%Time{} = time), do: "#{pad(time.hour)}:#{pad(time.minute)}"

  defp pad(number), do: number |> Integer.to_string() |> String.pad_leading(2, "0")
end
