defmodule LabelleBack.Studio.Loyalty.Notifier do
  @moduledoc "Recalcula após o commit do atendimento ou recebimento."
  use Ash.Notifier
  require Logger

  @impl true
  def notify(_notification) do
    case LabelleBack.Studio.Loyalty.Campaign.refresh() do
      {:ok, _} -> :ok
      {:error, _} -> retry()
    end
  rescue
    _ -> retry()
  end

  defp retry do
    Logger.error("Falha ao atualizar fidelidade; reconciliação automática pendente")
    %{} |> LabelleBack.Studio.Loyalty.Reconcile.new() |> Oban.insert()
    :ok
  end
end
