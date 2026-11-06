defmodule LabelleBack.Studio.ClientStatistics do
  @moduledoc "Histórico real: dias de visita e valores recebidos por serviços concluídos."
  @external_resource Path.join(__DIR__, "client_statistics.sql")
  @sql File.read!(@external_resource)

  def for_client(client_id, today \\ LabelleBack.Studio.Receivables.today()) do
    %{rows: [[visits, spent]]} = LabelleBack.Repo.query!(@sql, [client_id, today])
    %{visit_count: visits, total_spent: spent}
  end
end
