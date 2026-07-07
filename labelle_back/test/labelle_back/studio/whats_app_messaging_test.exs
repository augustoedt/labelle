defmodule LabelleBack.Studio.WhatsAppMessagingTest do
  # Muda a config global do adapter (Application.put_env), então não pode
  # rodar em paralelo com outro teste que dependa dela.
  use LabelleBack.DataCase, async: false

  alias LabelleBack.Studio.{Appointment, Client, Professional, Service}

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
    LabelleBack.Studio.Settings
    |> Ash.Changeset.for_create(
      :create,
      %{
        name: "Estúdio Teste",
        whatsapp_phone: "11999990000",
        message_confirmation: "confirmação para {{cliente}} - {{servico}} com {{profissional}}",
        message_reminder: "lembrete para {{cliente}}",
        message_thank_you: "obrigada {{cliente}}",
        message_reengagement: "reengajamento {{cliente}}",
        message_new_booking_notification: "novo agendamento {{cliente}}"
      },
      authorize?: false
    )
    |> Ash.create!()

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

  defp create_professional!(user) do
    Professional
    |> Ash.Changeset.for_create(
      :create,
      %{name: "Pro Teste", phone: "11999990000", user_id: user.id},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_service!(attrs) do
    defaults = %{
      name: "Corte",
      category: :cabelo,
      price: Decimal.new("100"),
      duration_minutes: 60
    }

    Service
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  defp create_client!(attrs \\ %{}) do
    defaults = %{name: "Cliente Teste", phone: "1198888#{Enum.random(1000..9999)}"}

    Client
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  defp create_appointment!(client, professional, service, attrs \\ %{}) do
    defaults = %{
      client_id: client.id,
      client_name: client.name,
      professional_id: professional.id,
      service_id: service.id,
      date: Date.utc_today(),
      time: ~T[10:00:00],
      status: :agendado
    }

    Appointment
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  describe "confirm" do
    test "sets status to confirmado and sends the confirmation message via the adapter" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FakeAdapter)
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!(%{phone: "11988887777"})
      appointment = create_appointment!(client, professional, service)

      confirmed =
        appointment
        |> Ash.Changeset.for_update(:confirm, %{}, actor: user)
        |> Ash.update!()

      assert confirmed.status == :confirmado
      assert_receive {:whatsapp_sent, "11988887777", message}
      assert message == "confirmação para Cliente Teste - Corte com Pro Teste"
    end

    test "adapter failure does not block confirming the appointment" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FailingAdapter)
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!()
      appointment = create_appointment!(client, professional, service)

      confirmed =
        appointment
        |> Ash.Changeset.for_update(:confirm, %{}, actor: user)
        |> Ash.update!()

      assert confirmed.status == :confirmado
    end

    test "a professional cannot confirm another professional's appointment" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FakeAdapter)
      owner = create_user!(:profissional)
      professional = create_professional!(owner)
      other_user = create_user!(:profissional)
      service = create_service!(%{})
      client = create_client!()
      appointment = create_appointment!(client, professional, service)

      assert_raise Ash.Error.Forbidden, fn ->
        appointment
        |> Ash.Changeset.for_update(:confirm, %{}, actor: other_user)
        |> Ash.update!()
      end
    end
  end

  describe "send_reminder" do
    test "sends the reminder message without changing status" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FakeAdapter)
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!(%{phone: "11977776666"})
      appointment = create_appointment!(client, professional, service, %{status: :confirmado})

      result =
        appointment
        |> Ash.Changeset.for_update(:send_reminder, %{}, actor: user)
        |> Ash.update!()

      assert result.status == :confirmado
      assert_receive {:whatsapp_sent, "11977776666", "lembrete para Cliente Teste"}
    end
  end

  describe "create" do
    test "an online booking (client app) sends the new-booking notification to the client" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FakeAdapter)
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!(%{phone: "11966665555"})

      create_appointment!(client, professional, service, %{source: :online})

      assert_receive {:whatsapp_sent, "11966665555", "novo agendamento Cliente Teste"}
    end

    test "a manual booking (staff/professional) does not send the new-booking notification" do
      Application.put_env(:labelle_back, :whatsapp_adapter, FakeAdapter)
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!(%{phone: "11955554444"})

      create_appointment!(client, professional, service, %{source: :manual})

      refute_receive {:whatsapp_sent, "11955554444", _}, 200
    end
  end
end
