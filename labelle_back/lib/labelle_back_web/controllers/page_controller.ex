defmodule LabelleBackWeb.PageController do
  use LabelleBackWeb, :controller

  # AshAuthentication's sign-in flow always redirects here after a
  # successful login, with no way to configure it to land on /admin
  # instead. Since this page (labelle_proxy's only public entry point
  # besides /admin itself) isn't proxied, bounce admins straight through
  # rather than dead-ending them on a 404.
  def home(conn, _params) do
    case conn.assigns[:current_user] do
      %{role: :admin} -> redirect(conn, to: "/admin")
      _ -> render(conn, :home)
    end
  end
end
