defmodule LabelleBack.Repo.Migrations.SeedEscovaG do
  use Ecto.Migration

  def up do
    # Only the G configuration has confirmed commercial values in the brief.
    # Do not rename services, merge historical rows or guess P/M prices.
    execute """
    INSERT INTO service_variants
      (id, service_id, name, description, price, duration_minutes, commission_percent, is_active)
    SELECT gen_random_uuid(), id, 'G', 'Cabelos longos e/ou volumosos', 60, 40, 40, true
    FROM services
    WHERE lower(btrim(name)) = 'escova' AND category = 'cabelo'
    ON CONFLICT (service_id, name) DO NOTHING
    """
  end

  # Keep commercial data if this data-only migration is rolled back.
  def down, do: :ok
end
