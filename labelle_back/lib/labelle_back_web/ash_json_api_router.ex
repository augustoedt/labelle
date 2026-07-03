defmodule LabelleBackWeb.AshJsonApiRouter do
  use AshJsonApi.Router,
    domains: [LabelleBack.Studio, LabelleBack.Accounts],
    open_api: "/open_api"
end
