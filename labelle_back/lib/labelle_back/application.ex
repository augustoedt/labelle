defmodule LabelleBack.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      LabelleBackWeb.Telemetry,
      LabelleBack.Repo,
      {DNSCluster, query: Application.get_env(:labelle_back, :dns_cluster_query) || :ignore},
      {Oban,
       AshOban.config(
         Application.fetch_env!(:labelle_back, :ash_domains),
         Application.fetch_env!(:labelle_back, Oban)
       )},
      {Phoenix.PubSub, name: LabelleBack.PubSub},
      # Start a worker by calling: LabelleBack.Worker.start_link(arg)
      # {LabelleBack.Worker, arg},
      # Start to serve requests, typically the last entry
      LabelleBackWeb.Endpoint,
      {AshAuthentication.Supervisor, [otp_app: :labelle_back]}
    ]

    # See https://elixir.hexdocs.pm/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: LabelleBack.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    LabelleBackWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
