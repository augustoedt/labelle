defmodule LabelleBack.Studio.Reminders.Messages do
  @moduledoc """
  Textos das mensagens de lembrete, montados a partir dos templates
  configuráveis em `LabelleBack.Studio.Settings` (tela de Configurações). O
  texto é gravado no lembrete no momento da geração, então o que a equipe
  envia (ou o provedor enviará) é exatamente o que estava configurado
  naquele momento — editar o template depois não altera lembretes já
  gerados.
  """

  alias LabelleBack.Studio.Settings

  def build(:agradecimento, client_name) do
    settings = Settings.current!(authorize?: false)
    render(settings.message_thank_you, settings, client_name)
  end

  def build(:reengajamento, client_name) do
    settings = Settings.current!(authorize?: false)
    render(settings.message_reengagement, settings, client_name)
  end

  defp render(template, settings, client_name) do
    template
    |> String.replace("{{cliente}}", first_name(client_name))
    |> String.replace("{{estudio}}", settings.name)
  end

  defp first_name(nil), do: "tudo bem"

  defp first_name(name) do
    name |> String.split(" ", trim: true) |> List.first() || name
  end
end
