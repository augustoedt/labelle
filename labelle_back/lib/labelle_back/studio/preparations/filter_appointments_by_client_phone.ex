defmodule LabelleBack.Studio.Preparations.FilterAppointmentsByClientPhone do
  @moduledoc """
  Filtra agendamentos pelo telefone da cliente. `client_phone` é texto
  livre (pode ter máscara), então a coluna é normalizada no SQL com
  regexp_replace; compara com e sem o prefixo 55 para cobrir registros
  antigos gravados no formato local.
  """
  use Ash.Resource.Preparation

  require Ash.Query

  alias LabelleBack.Studio.Changes.NormalizePhone

  @impl true
  def prepare(query, _opts, _context) do
    with_55 = query |> Ash.Query.get_argument(:phone) |> NormalizePhone.normalize()
    without_55 = String.trim_leading(with_55, "55")

    Ash.Query.filter(
      query,
      fragment("regexp_replace(coalesce(?, ''), '\\D', '', 'g')", client_phone) in [
        ^with_55,
        ^without_55
      ]
    )
  end
end
