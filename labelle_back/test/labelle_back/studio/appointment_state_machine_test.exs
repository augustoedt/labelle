defmodule LabelleBack.Studio.AppointmentStateMachineTest do
  @moduledoc """
  Cobre o ciclo de vida do agendamento via AshStateMachine:
  agendado → confirmado → em_atendimento → concluido, e cancelamento.
  Status nunca é input direto — só muda pelas actions de transição.
  """
  use LabelleBack.DataCase, async: true

  alias LabelleBack.Studio.{Appointment, Client, Professional, Service}

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

  defp create_fixtures! do
    user =
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
      |> Ash.Changeset.for_update(:update, %{role: :profissional}, authorize?: false)
      |> Ash.update!()

    professional =
      Professional
      |> Ash.Changeset.for_create(
        :create,
        %{name: "Pro Teste", phone: "11999990000", user_id: user.id},
        authorize?: false
      )
      |> Ash.create!()

    service =
      Service
      |> Ash.Changeset.for_create(
        :create,
        %{name: "Corte", category: :cabelo, price: Decimal.new("100"), duration_minutes: 60},
        authorize?: false
      )
      |> Ash.create!()

    client =
      Client
      |> Ash.Changeset.for_create(
        :create,
        %{name: "Cliente Teste", phone: "1198888#{Enum.random(1000..9999)}"},
        authorize?: false
      )
      |> Ash.create!()

    appointment =
      Appointment
      |> Ash.Changeset.for_create(
        :create,
        %{
          client_id: client.id,
          client_name: client.name,
          professional_id: professional.id,
          service_id: service.id,
          date: Date.utc_today(),
          time: ~T[10:00:00]
        },
        authorize?: false
      )
      |> Ash.create!()

    %{user: user, appointment: appointment}
  end

  defp transition!(appointment, action, attrs \\ %{}) do
    appointment
    |> Ash.Changeset.for_update(action, attrs, authorize?: false)
    |> Ash.update!()
  end

  test "fluxo completo: agendado → confirmado → em_atendimento → concluido" do
    %{appointment: appointment} = create_fixtures!()
    assert appointment.status == :agendado

    assert transition!(appointment, :confirm).status == :confirmado

    started = transition!(appointment, :start)
    assert started.status == :em_atendimento

    finalized = transition!(started, :finalize, %{payment_method: :pix})
    assert finalized.status == :concluido
  end

  test "start também funciona direto de agendado (cliente que chega sem confirmar)" do
    %{appointment: appointment} = create_fixtures!()
    assert transition!(appointment, :start).status == :em_atendimento
  end

  test "não confirma duas vezes nem confirma agendamento cancelado" do
    %{appointment: appointment} = create_fixtures!()
    confirmed = transition!(appointment, :confirm)

    assert_raise Ash.Error.Invalid, fn -> transition!(confirmed, :confirm) end

    cancelled = transition!(create_fixtures!().appointment, :cancel)
    assert cancelled.status == :cancelado
    assert_raise Ash.Error.Invalid, fn -> transition!(cancelled, :confirm) end
  end

  test "não finaliza sem iniciar o atendimento" do
    %{appointment: appointment} = create_fixtures!()

    assert_raise Ash.Error.Invalid, fn ->
      transition!(appointment, :finalize, %{payment_method: :pix})
    end

    assert_raise Ash.Error.Invalid, fn ->
      appointment |> transition!(:confirm) |> transition!(:finalize, %{payment_method: :pix})
    end
  end

  test "não cancela atendimento já concluído" do
    %{appointment: appointment} = create_fixtures!()

    concluded =
      appointment
      |> transition!(:start)
      |> transition!(:finalize, %{payment_method: :dinheiro})

    assert_raise Ash.Error.Invalid, fn -> transition!(concluded, :cancel) end
  end

  test "status não é mais aceito como input no create nem no update" do
    %{appointment: appointment} = create_fixtures!()

    assert_raise Ash.Error.Invalid, fn ->
      Appointment
      |> Ash.Changeset.for_create(
        :create,
        %{
          client_name: "X",
          professional_id: appointment.professional_id,
          service_id: appointment.service_id,
          date: Date.utc_today(),
          time: ~T[11:00:00],
          status: :concluido
        },
        authorize?: false
      )
      |> Ash.create!()
    end

    assert_raise Ash.Error.Invalid, fn ->
      appointment
      |> Ash.Changeset.for_update(:update, %{status: :cancelado}, authorize?: false)
      |> Ash.update!()
    end
  end
end
