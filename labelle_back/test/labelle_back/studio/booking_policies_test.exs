defmodule LabelleBack.Studio.BookingPoliciesTest do
  @moduledoc """
  Cobre as policies de criação fechadas na auditoria de segurança:
  - agendamento online (anônimo) só pela action :book_online, de accept
    mínimo — status/preço/origem calculados no servidor;
  - create manual restrito a admin ou à própria profissional;
  - itens de serviço (AppointmentService) restritos a admin ou à
    profissional dona do atendimento (o preço entra na cobrança).
  """
  use LabelleBack.DataCase, async: true

  alias LabelleBack.Studio.{Appointment, AppointmentService, Client, Professional, Promotion, Service}

  setup do
    LabelleBack.Studio.Settings
    |> Ash.Changeset.for_create(
      :create,
      %{
        name: "Estúdio Teste",
        whatsapp_phone: "11999990000",
        message_confirmation: "confirmação {{cliente}}",
        message_reminder: "lembrete {{cliente}}",
        message_thank_you: "obrigada {{cliente}} - {{estudio}}",
        message_reengagement: "reengajamento {{cliente}} - {{estudio}}",
        message_new_booking_notification: "novo agendamento {{cliente}}"
      },
      authorize?: false
    )
    |> Ash.create!()

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

  defp create_professional!(user, name \\ "Pro Teste") do
    Professional
    |> Ash.Changeset.for_create(
      :create,
      %{name: name, phone: "11999990000", user_id: user.id},
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

  defp create_client! do
    Client
    |> Ash.Changeset.for_create(
      :create,
      %{name: "Cliente Teste", phone: "1198888#{Enum.random(1000..9999)}"},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_appointment!(professional, service, attrs \\ %{}) do
    defaults = %{
      client_id: create_client!().id,
      client_name: "Cliente Teste",
      professional_id: professional.id,
      service_id: service.id,
      date: Date.utc_today(),
      time: ~T[10:00:00]
    }

    Appointment
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  defp book_online_attrs(professional, service) do
    %{
      client_name: "Cliente App",
      client_phone: "11977770000",
      professional_id: professional.id,
      service_id: service.id,
      date: Date.add(Date.utc_today(), 1),
      time: ~T[14:00:00]
    }
  end

  describe "book_online (app público, sem login)" do
    test "cria com status/origem/preço travados pelo servidor" do
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{price: Decimal.new("120"), duration_minutes: 45})

      appointment =
        Appointment
        |> Ash.Changeset.for_create(:book_online, book_online_attrs(professional, service))
        |> Ash.create!()

      assert appointment.status == :agendado
      assert appointment.source == :online
      assert appointment.service_name == service.name
      assert Decimal.equal?(appointment.price, Decimal.new("120"))
      assert appointment.duration_minutes == 45
    end

    test "aplica a promoção ativa do serviço (percentual e valor fixo)" do
      professional = create_professional!(create_user!(:profissional))
      percent_service = create_service!(%{name: "Corte Promo %", price: Decimal.new("100")})
      value_service = create_service!(%{name: "Corte Promo R$", price: Decimal.new("100")})

      Promotion
      |> Ash.Changeset.for_create(
        :create,
        %{
          name: "10% off",
          discount_type: :percent,
          discount_value: Decimal.new("10"),
          service_id: percent_service.id,
          is_active: true
        },
        authorize?: false
      )
      |> Ash.create!()

      Promotion
      |> Ash.Changeset.for_create(
        :create,
        %{
          name: "30 off",
          discount_type: :value,
          discount_value: Decimal.new("30"),
          service_id: value_service.id,
          is_active: true
        },
        authorize?: false
      )
      |> Ash.create!()

      percent_booking =
        Appointment
        |> Ash.Changeset.for_create(:book_online, book_online_attrs(professional, percent_service))
        |> Ash.create!()

      value_booking =
        Appointment
        |> Ash.Changeset.for_create(:book_online, book_online_attrs(professional, value_service))
        |> Ash.create!()

      assert Decimal.equal?(percent_booking.price, Decimal.new("90.00"))
      assert Decimal.equal?(value_booking.price, Decimal.new("70"))
    end
  end

  describe "create manual" do
    test "anônimo não cria pelo create genérico (nem com preço inventado)" do
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{})

      attrs =
        professional
        |> book_online_attrs(service)
        |> Map.merge(%{price: Decimal.new("1"), source: :manual})

      assert_raise Ash.Error.Forbidden, fn ->
        Appointment
        |> Ash.Changeset.for_create(:create, attrs)
        |> Ash.create!()
      end
    end

    test "admin cria com preço explícito e confirma pela action" do
      admin = create_user!(:admin)
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{})

      appointment =
        Appointment
        |> Ash.Changeset.for_create(
          :create,
          professional
          |> book_online_attrs(service)
          |> Map.merge(%{price: Decimal.new("55")}),
          actor: admin
        )
        |> Ash.create!()

      assert appointment.status == :agendado
      assert Decimal.equal?(appointment.price, Decimal.new("55"))

      confirmed =
        appointment
        |> Ash.Changeset.for_update(:confirm, %{}, actor: admin)
        |> Ash.update!()

      assert confirmed.status == :confirmado
    end

    test "profissional cria para si mesma, mas não para outra" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      other = create_professional!(create_user!(:profissional), "Outra Pro")
      service = create_service!(%{})

      own =
        Appointment
        |> Ash.Changeset.for_create(
          :create,
          book_online_attrs(professional, service),
          actor: user
        )
        |> Ash.create!()

      assert own.professional_id == professional.id

      assert_raise Ash.Error.Forbidden, fn ->
        Appointment
        |> Ash.Changeset.for_create(:create, book_online_attrs(other, service), actor: user)
        |> Ash.create!()
      end
    end
  end

  describe "appointment_services" do
    test "anônimo não adiciona item com preço arbitrário ao atendimento" do
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{})
      appointment = create_appointment!(professional, service)

      assert_raise Ash.Error.Forbidden, fn ->
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{appointment_id: appointment.id, service_id: service.id, price: Decimal.new("0.01")}
        )
        |> Ash.create!()
      end
    end

    test "profissional dona do atendimento adiciona item; outra não" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      other_user = create_user!(:profissional)
      create_professional!(other_user, "Outra Pro")
      service = create_service!(%{})
      appointment = create_appointment!(professional, service)

      item =
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{appointment_id: appointment.id, service_id: service.id},
          actor: user
        )
        |> Ash.create!()

      assert item.appointment_id == appointment.id

      assert_raise Ash.Error.Forbidden, fn ->
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{appointment_id: appointment.id, service_id: service.id},
          actor: other_user
        )
        |> Ash.create!()
      end
    end

    test "admin adiciona item a qualquer atendimento" do
      admin = create_user!(:admin)
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{})
      appointment = create_appointment!(professional, service)

      item =
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{appointment_id: appointment.id, service_id: service.id},
          actor: admin
        )
        |> Ash.create!()

      assert item.appointment_id == appointment.id
    end
  end
end
