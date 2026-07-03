defmodule LabelleBackWeb.Plugs.RequireAdmin do
  @moduledoc """
  Gates access to internal tooling (e.g. AshAdmin) to actors with `role: :admin`.

  Deliberately does not reveal *why* access was denied: a non-admin (or
  unauthenticated) visitor is bounced to `/sign-in` with the same generic
  error message shown for a failed login, so nothing here confirms that a
  protected panel exists or that the issue is permissions rather than a
  mistyped email.
  """

  import Plug.Conn
  import Phoenix.Controller, only: [put_flash: 3, redirect: 2]

  def init(opts), do: opts

  def call(conn, _opts) do
    case conn.assigns[:current_user] do
      %{role: :admin} ->
        conn

      _ ->
        conn
        |> clear_session()
        |> put_flash(:error, "Usuário não encontrado")
        |> redirect(to: "/sign-in")
        |> halt()
    end
  end
end
