defmodule LabelleBack.Repo.Migrations.AddLoyaltyPointAudits do
  use Ecto.Migration

  def change do
    create table(:loyalty_point_audits) do
      add :client_id, :uuid, null: false
      add :campaign, :text, null: false
      add :previous_points, :integer, null: false
      add :points, :integer, null: false
      add :paid, :decimal, null: false
      add :visit_days, :integer, null: false
      add :monthly_bonus, :integer, null: false
      add :calculated_at, :utc_datetime_usec, null: false
    end

    create index(:loyalty_point_audits, [:client_id, :calculated_at])
  end
end
