defmodule LabelleBack.Studio.Changes.NormalizePhone do
  @moduledoc """
  Normaliza telefone para o formato internacional: só dígitos, sempre com
  o prefixo 55 do Brasil ("(11) 98888-7777" → "5511988887777") — o formato
  que wa.me/WAHA esperam.

  `normalize/1` é pública de propósito: qualquer lookup por telefone
  (cliente, agendamento) deve normalizar o input por ela para comparar
  com o que está gravado.
  """
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    case Ash.Changeset.get_attribute(changeset, :phone) do
      nil ->
        changeset

      phone ->
        Ash.Changeset.force_change_attribute(changeset, :phone_normalized, normalize(phone))
    end
  end

  @doc "Só dígitos, sempre com prefixo 55 (string vazia entra, vazia sai)."
  def normalize(phone) do
    digits = phone |> to_string() |> String.replace(~r/\D/, "")

    cond do
      digits == "" -> ""
      String.starts_with?(digits, "55") and String.length(digits) >= 12 -> digits
      true -> "55" <> digits
    end
  end
end
