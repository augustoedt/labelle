defmodule LabelleBack.Studio.Actions.UpsertClientFromBooking do
  @moduledoc """
  Upsert de cliente a partir de um agendamento online (app público, sem
  login): se o telefone já existe, atualiza o nome; senão cria com origem
  `:app_cliente`. Consulta ou cadastro não prova que houve atendimento.

  Roda sem actor (endpoint público) — por isso os `authorize?: false`
  internos; quem chama de fora deve fazer o mesmo.
  """
  use Ash.Resource.Actions.Implementation

  require Ash.Query

  alias LabelleBack.Studio.Changes.NormalizePhone
  alias LabelleBack.Studio.Client

  @impl true
  def run(input, _opts, _context) do
    name = String.trim(input.arguments.name)
    phone = input.arguments.phone
    phone_norm = NormalizePhone.normalize(phone)

    existing =
      Client
      |> Ash.Query.filter(phone_normalized == ^phone_norm)
      |> Ash.read_one!(authorize?: false)

    client =
      if existing do
        existing
        |> Ash.Changeset.for_update(
          :update,
          %{name: name},
          authorize?: false
        )
        |> Ash.update!()
      else
        Client
        |> Ash.Changeset.for_create(
          :create,
          %{
            name: name,
            phone: phone,
            is_active: true,
            source: :app_cliente
          },
          authorize?: false
        )
        |> Ash.create!()
      end

    {:ok, client}
  end
end
