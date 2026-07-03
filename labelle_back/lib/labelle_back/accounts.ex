defmodule LabelleBack.Accounts do
  use Ash.Domain, otp_app: :labelle_back, extensions: [AshAdmin.Domain, AshJsonApi.Domain]

  admin do
    show? true
  end

  json_api do
    authorize? true

    routes do
      base_route "/users", LabelleBack.Accounts.User do
        get :read
        index :read
      end
    end
  end

  resources do
    resource LabelleBack.Accounts.Token
    resource LabelleBack.Accounts.User
  end
end
