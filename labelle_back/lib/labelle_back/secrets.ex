defmodule LabelleBack.Secrets do
  use AshAuthentication.Secret

  def secret_for(
        [:authentication, :tokens, :signing_secret],
        LabelleBack.Accounts.User,
        _opts,
        _context
      ) do
    Application.fetch_env(:labelle_back, :token_signing_secret)
  end
end
