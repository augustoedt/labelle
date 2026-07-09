defmodule LabelleBack.Studio.ClientReminderDeliverTest do
  # Muda a config global do adapter (Application.put_env), então não pode
  # rodar em paralelo com outro teste que dependa dela.
  use LabelleBack.DataCase, async: false

  alias LabelleBack.Studio.{Client, ClientReminder}

  defmodule FakeAdapter do
    @behaviour LabelleBack.Messaging.WhatsApp

    @impl true
    def configured?, do: true

    @impl true
    def send_message(phone, message) do
      send(self(), {:whatsapp_sent, phone, message})
      {:ok, "fake-id"}
    end
  end

  defmodule FailingAdapter do
    @behaviour LabelleBack.Messaging.WhatsApp

    @impl true
    def configured?, do: true

    @impl true
    def send_message(_phone, _message), do: {:error, :boom}
  end

  setup do
    previous_adapter = Application.get_env(:labelle_back, :whatsapp_adapter)
    on_exit(fn -> Application.put_env(:labelle_back, :whatsapp_adapter, previous_adapter) end)

    :ok
  end

  defp create_user!(role) do
    LabelleBack.Accounts.User
    |> Ash.Changeset.for_create(
      :register_with_password,
      %{
        email: "user-#{System.unique_integer([:positive])}@test.com",
        password: "senha-secreta-123",
        password_confirmation: "senha-secreta-123"
      },
      authorize?: false
    )
    |> Ash.create!()
    |> Ash.Changeset.for_update(:update, %{role: role}, authorize?: false)
    |> Ash.update!()
  end

  defp create_client!(attrs \\ %{}) do
    defaults = %{name: "Cliente Teste", phone: "1198888#{Enum.random(1000..9999)}"}

    Client
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  defp create_reminder!(client, attrs \\ %{}) do
    defaults = %{
      client_id: client.id,
      kind: :agradecimento,
      due_date: Date.utc_today(),
      message: "obrigada, #{client.name}!",
      client_name: client.name,
      client_phone: client.phone
    }

    ClientReminder
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  describe "deliver" do
    test "sends the message via the adapter and marks the reminder as sent automatically" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FakeAdapter)
      admin = create_user!(:admin)
      client = create_client!(%{phone: "11988887777"})
      reminder = create_reminder!(client)

      delivered =
        reminder
        |> Ash.Changeset.for_update(:deliver, %{}, actor: admin)
        |> Ash.update!()

      assert delivered.status == :enviado
      assert delivered.sent_via == :automatico
      assert delivered.sent_at
      assert_receive {:whatsapp_sent, "11988887777", "obrigada, Cliente Teste!"}
    end

    test "keeps the reminder pending when the adapter fails to send" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FailingAdapter)
      admin = create_user!(:admin)
      client = create_client!()
      reminder = create_reminder!(client)

      assert {:error, %Ash.Error.Invalid{}} =
               reminder
               |> Ash.Changeset.for_update(:deliver, %{}, actor: admin)
               |> Ash.update()

      assert Ash.get!(ClientReminder, reminder.id, authorize?: false).status == :pendente
    end

    test "fails when no WhatsApp provider is configured" do
      Application.put_env(
        :labelle_back,
        :whatsapp_adapter,
        LabelleBack.Messaging.WhatsApp.NotConfigured
      )

      admin = create_user!(:admin)
      client = create_client!()
      reminder = create_reminder!(client)

      assert {:error, %Ash.Error.Invalid{}} =
               reminder
               |> Ash.Changeset.for_update(:deliver, %{}, actor: admin)
               |> Ash.update()

      assert Ash.get!(ClientReminder, reminder.id, authorize?: false).status == :pendente
    end

    test "a professional cannot deliver a reminder" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FakeAdapter)
      professional_user = create_user!(:profissional)
      client = create_client!()
      reminder = create_reminder!(client)

      assert_raise Ash.Error.Forbidden, fn ->
        reminder
        |> Ash.Changeset.for_update(:deliver, %{}, actor: professional_user)
        |> Ash.update!()
      end
    end
  end
end
