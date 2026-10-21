defmodule LabelleBack.Repo.Migrations.IndexCompletedVisitsByClient do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:appointments, [:client_id, :status],
             where: "client_id IS NOT NULL",
             concurrently: true,
             name: :appointments_client_completed_visits_index
           )
  end
end
