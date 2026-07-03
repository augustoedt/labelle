defmodule LabelleBack.Release do
  @moduledoc """
  Used for executing DB release tasks when run in production without Mix
  installed (matches the module `mix phx.gen.release` would normally
  generate — this project was scaffolded via the Ash installer instead, which
  doesn't include it).
  """
  @app :labelle_back

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
