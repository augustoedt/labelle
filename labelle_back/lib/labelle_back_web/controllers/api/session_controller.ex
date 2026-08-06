defmodule LabelleBackWeb.Api.SessionController do
  use LabelleBackWeb, :controller

  alias LabelleBack.Accounts

  def create(conn, %{"email" => email, "password" => password}) do
    # Endpoint público de login: ainda não existe actor, por isso o
    # authorize?: false — a strategy de password valida as credenciais.
    case Accounts.sign_in_with_password(email, password, authorize?: false) do
      {:ok, user} when not is_nil(user) ->
        json(conn, %{
          token: user.__metadata__.token,
          user: %{id: user.id, email: to_string(user.email), role: user.role}
        })

      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Email ou senha inválidos"})
    end
  end

  def create(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "email e password são obrigatórios"})
  end
end
