defmodule LabelleBackWeb.AshAdminActorPlug do
  @moduledoc """
  Defaults AshAdmin's actor picker to the currently signed-in user, instead of
  requiring the developer to manually pick "Act as..." every time.

  Falls back to the default `AshAdmin.ActorPlug.Plug` (cookie-based manual
  impersonation) whenever it has already resolved an actor.
  """

  @behaviour AshAdmin.ActorPlug

  @impl true
  def set_actor_session(conn) do
    conn = AshAdmin.ActorPlug.Plug.set_actor_session(conn)

    case conn.assigns[:actor] do
      nil -> maybe_assign_current_user(conn)
      _ -> conn
    end
  end

  defp maybe_assign_current_user(conn) do
    case conn.assigns[:current_user] do
      nil -> conn
      user -> Plug.Conn.assign(conn, :actor, user)
    end
  end

  @impl true
  def actor_assigns(socket, session) do
    default = AshAdmin.ActorPlug.Plug.actor_assigns(socket, session)

    case default[:actor] do
      nil ->
        case session["current_user_id"] do
          nil -> default
          id -> Keyword.put(default, :actor, load_user(id))
        end

      _ ->
        default
    end
  end

  defp load_user(id) do
    case Ash.get(LabelleBack.Accounts.User, id, authorize?: false) do
      {:ok, user} -> user
      _ -> nil
    end
  end

  def extra_session(conn) do
    %{"current_user_id" => conn.assigns[:current_user] && conn.assigns.current_user.id}
  end
end
