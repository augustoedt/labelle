defmodule LabelleBack.Studio.Loyalty.Campaign do
  @moduledoc "Campanha outubro–dezembro/2026, recalculada sem incrementar saldos."
  alias LabelleBack.Repo
  @external_resource Path.join(__DIR__, "campaign.sql")
  @sql File.read!(@external_resource)

  def refresh(today \\ LabelleBack.Studio.Receivables.today()) do
    Repo.transaction(fn ->
      Repo.query!("SELECT pg_advisory_xact_lock(2026100120261231)")
      result = Repo.query!(@sql, [today])
      rows = Enum.map(result.rows, &(Enum.zip(result.columns, &1) |> Map.new()))

      for row <- rows, row["old_points"] != row["points"] do
        Repo.query!(
          """
          INSERT INTO loyalty_point_audits (client_id,campaign,previous_points,points,paid,visit_days,monthly_bonus,calculated_at)
          VALUES ($1::text::uuid,'2026-q4',$2,$3,$4::text::numeric,$5,$6,now())
          """,
          [
            row["id"],
            row["old_points"],
            row["points"],
            row["paid"],
            row["visit_days"],
            row["monthly_bonus"]
          ]
        )

        Repo.query!("UPDATE clients SET loyalty_points=$1 WHERE id::text=$2", [
          row["points"],
          row["id"]
        ])
      end

      Enum.count(rows, &(&1["old_points"] != &1["points"]))
    end)
  end
end
