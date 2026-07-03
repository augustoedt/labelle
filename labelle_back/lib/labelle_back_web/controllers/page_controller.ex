defmodule LabelleBackWeb.PageController do
  use LabelleBackWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
