defmodule LabelleBack.Studio.Loyalty.Reconcile do
  @moduledoc "Reconciliação periódica e novas tentativas de pontuação."
  use Oban.Worker, queue: :default, max_attempts: 10
  @impl Oban.Worker
  def perform(_job) do
    case LabelleBack.Studio.Loyalty.Campaign.refresh() do
      {:ok, _} -> :ok
      {:error, error} -> {:error, error}
    end
  end
end
