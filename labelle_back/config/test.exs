import Config
config :labelle_back, Oban, testing: :manual
config :labelle_back, token_signing_secret: "8XUOWmsui3kOP/35H5MDzkGrPl2REGLq"
config :bcrypt_elixir, log_rounds: 1
config :ash, policies: [show_policy_breakdowns?: true], disable_async?: true

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :labelle_back, LabelleBack.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  port: 5433,
  database: "labelle_back_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :labelle_back, LabelleBackWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "oUnOz8RunXvE6Fc6Ws+lj4lRFCiFMDqHNfKwyMwIK/0w58R7D39XeOaL/EPRtFFu",
  server: false

# In test we don't send emails
config :labelle_back, LabelleBack.Mailer, adapter: Swoosh.Adapters.Test

# Disable swoosh api client as it is only required for production adapters
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Enable helpful, but potentially expensive runtime checks
config :phoenix_live_view,
  enable_expensive_runtime_checks: true

# Sort query params output of verified routes for robust url comparisons
config :phoenix,
  sort_verified_routes_query_params: true
