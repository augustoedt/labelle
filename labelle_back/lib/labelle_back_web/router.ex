defmodule LabelleBackWeb.Router do
  use LabelleBackWeb, :router

  import Oban.Web.Router
  use AshAuthentication.Phoenix.Router

  import AshAuthentication.Plug.Helpers

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {LabelleBackWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :load_from_session
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug :load_from_bearer
    plug :set_actor, :user
  end

  pipeline :api_public do
    plug :accepts, ["json"]
  end

  pipeline :require_admin do
    plug LabelleBackWeb.Plugs.RequireAdmin
  end

  scope "/", LabelleBackWeb do
    pipe_through :browser

    ash_authentication_live_session :authenticated_routes do
      # in each liveview, add one of the following at the top of the module:
      #
      # If an authenticated user must be present:
      # on_mount {LabelleBackWeb.LiveUserAuth, :live_user_required}
      #
      # If an authenticated user *may* be present:
      # on_mount {LabelleBackWeb.LiveUserAuth, :live_user_optional}
      #
      # If an authenticated user must *not* be present:
      # on_mount {LabelleBackWeb.LiveUserAuth, :live_no_user}
    end
  end

  scope "/api/json" do
    pipe_through [:api]

    forward "/swaggerui", OpenApiSpex.Plug.SwaggerUI,
      path: "/api/json/open_api",
      default_model_expand_depth: 4

    forward "/", LabelleBackWeb.AshJsonApiRouter
  end

  scope "/api/session", LabelleBackWeb.Api do
    pipe_through [:api_public]

    post "/", SessionController, :create
  end

  scope "/api/client", LabelleBackWeb.Api do
    pipe_through [:api_public]

    post "/available_slots", ClientController, :available_slots
    post "/appointments", ClientController, :appointments
    post "/loyalty", ClientController, :loyalty
    post "/upsert", ClientController, :upsert
    post "/settings", ClientController, :settings
  end

  scope "/api/webhooks", LabelleBackWeb.Api do
    pipe_through [:api_public]

    post "/waha", WahaWebhookController, :create
  end

  scope "/", LabelleBackWeb do
    pipe_through :browser

    get "/", PageController, :home
    auth_routes AuthController, LabelleBack.Accounts.User, path: "/auth"
    sign_out_route AuthController

    # Remove these if you'd like to use your own authentication views
    sign_in_route register_path: "/register",
                  reset_path: "/reset",
                  auth_routes_prefix: "/auth",
                  on_mount: [{LabelleBackWeb.LiveUserAuth, :live_no_user}],
                  overrides: [
                    LabelleBackWeb.AuthOverrides,
                    Elixir.AshAuthentication.Phoenix.Overrides.DaisyUI
                  ]

    # Remove this if you do not want to use the reset password feature
    reset_route auth_routes_prefix: "/auth",
                overrides: [
                  LabelleBackWeb.AuthOverrides,
                  Elixir.AshAuthentication.Phoenix.Overrides.DaisyUI
                ]

    # Remove this if you do not use the confirmation strategy
    confirm_route LabelleBack.Accounts.User, :confirm_new_user,
      auth_routes_prefix: "/auth",
      overrides: [
        LabelleBackWeb.AuthOverrides,
        Elixir.AshAuthentication.Phoenix.Overrides.DaisyUI
      ]

    # Remove this if you do not use the magic link strategy.
    magic_sign_in_route(LabelleBack.Accounts.User, :magic_link,
      auth_routes_prefix: "/auth",
      overrides: [
        LabelleBackWeb.AuthOverrides,
        Elixir.AshAuthentication.Phoenix.Overrides.DaisyUI
      ]
    )
  end

  # Other scopes may use custom stacks.
  # scope "/api", LabelleBackWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:labelle_back, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: LabelleBackWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end

    scope "/" do
      pipe_through :browser

      oban_dashboard("/oban")
    end
  end

  # /admin (AshAdmin) has its own flag, separate from :dev_routes: it's
  # meant to exist in production too (reached through labelle_proxy, not
  # exposed directly), unlike LiveDashboard/Oban above which are dev-only.
  if Application.compile_env(:labelle_back, :admin_routes) do
    import AshAdmin.Router

    scope "/admin" do
      pipe_through [:browser, :require_admin]

      ash_admin "/", session: {LabelleBackWeb.AshAdminActorPlug, :extra_session, []}
    end
  end
end
