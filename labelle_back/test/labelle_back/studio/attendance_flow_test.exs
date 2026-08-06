defmodule LabelleBack.Studio.AttendanceFlowTest do
  use LabelleBack.DataCase, async: true

  require Ash.Query

  alias LabelleBack.Studio

  alias LabelleBack.Studio.{
    Appointment,
    AppointmentService,
    Client,
    ClientReminder,
    Professional,
    Service,
    Transaction
  }

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
    {status, attrs} = Map.pop(attrs, :status, :em_atendimento)

    defaults = %{
      client_id: client.id,
      client_name: client.name,
      professional_id: professional.id,
      service_id: service.id,
      date: Date.utc_today(),
      time: ~T[10:00:00]
    }

    Appointment
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
    |> transition_to!(status)
  end

  # O status não é mais input direto: o agendamento anda pelas actions de
  # transição do state machine, como no fluxo real.
  defp transition_to!(appointment, :agendado), do: appointment

  defp transition_to!(appointment, :em_atendimento) do
    appointment
    |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
    |> Ash.update!()
  end

  defp transition_to!(appointment, :concluido) do
    appointment
    |> transition_to!(:em_atendimento)
    |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, authorize?: false)
    |> Ash.update!()
  end

  describe "finalize" do
    test "professional finalizes own appointment, charging main service + extra items" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{price: Decimal.new("100")})
      extra = create_service!(%{name: "Escova", price: Decimal.new("50")})
      client = create_client!()
      appointment = create_appointment!(client, professional, service)

      # profissional adiciona um serviço não previsto durante o atendimento
      AppointmentService
      |> Ash.Changeset.for_create(
        :create,
        %{appointment_id: appointment.id, service_id: extra.id, unplanned: true},
        actor: user
      )
      |> Ash.create!()

      finalized =
        appointment
        |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, actor: user)
        |> Ash.update!()

      assert finalized.status == :concluido
      assert finalized.payment_method == :pix

      [transaction] =
        Transaction
        |> Ash.Query.filter(appointment_id == ^appointment.id)
        |> Ash.read!(authorize?: false)

      assert transaction.status == :pago
      assert transaction.payment_method == :pix
      assert Decimal.equal?(transaction.amount, Decimal.new("150"))
      assert transaction.professional_id == professional.id
    end

    test "finalize requires payment method and rejects already-closed appointments" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!()
      appointment = create_appointment!(client, professional, service)

      assert_raise Ash.Error.Invalid, fn ->
        appointment
        |> Ash.Changeset.for_update(:finalize, %{}, actor: user)
        |> Ash.update!()
      end

      done = create_appointment!(client, professional, service, %{status: :concluido})

      assert_raise Ash.Error.Invalid, fn ->
        done
        |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, actor: user)
        |> Ash.update!()
      end
    end

    test "finalize updates an existing pending transaction instead of duplicating" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{price: Decimal.new("80")})
      client = create_client!()
      appointment = create_appointment!(client, professional, service)

      Transaction
      |> Ash.Changeset.for_create(
        :create,
        %{
          type: :entrada,
          category: :servico,
          amount: Decimal.new("80"),
          date: Date.utc_today(),
          appointment_id: appointment.id,
          status: :pendente_confirmacao,
          payment_method: :a_definir
        },
        authorize?: false
      )
      |> Ash.create!()

      appointment
      |> Ash.Changeset.for_update(:finalize, %{payment_method: :dinheiro}, actor: user)
      |> Ash.update!()

      [transaction] =
        Transaction
        |> Ash.Query.filter(appointment_id == ^appointment.id)
        |> Ash.read!(authorize?: false)

      assert transaction.status == :pago
      assert transaction.payment_method == :dinheiro
    end
  end

  describe "reminder generation" do
    defp run_generate_due! do
      Studio.generate_due_reminders!(authorize?: false)
    end

    test "creates thank-you reminder 20+ days after last concluded appointment" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!()

      create_appointment!(client, professional, service, %{
        status: :concluido,
        date: Date.add(Date.utc_today(), -21)
      })

      assert run_generate_due!() == 1

      [reminder] =
        ClientReminder
        |> Ash.Query.filter(client_id == ^client.id)
        |> Ash.read!(authorize?: false)

      assert reminder.kind == :agradecimento
      assert reminder.status == :pendente
      assert reminder.client_phone == client.phone
      assert reminder.message == "obrigada Cliente - Estúdio Teste"

      # rodar de novo não duplica enquanto o lembrete está pendente
      assert run_generate_due!() == 0
    end

    test "does not remind before 20 days, when rebooked, or without concluded visits" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})

      recent = create_client!(%{name: "Recente"})

      create_appointment!(recent, professional, service, %{
        status: :concluido,
        date: Date.add(Date.utc_today(), -10)
      })

      rebooked = create_client!(%{name: "Reagendada"})

      create_appointment!(rebooked, professional, service, %{
        status: :concluido,
        date: Date.add(Date.utc_today(), -30)
      })

      create_appointment!(rebooked, professional, service, %{
        status: :agendado,
        date: Date.add(Date.utc_today(), 3)
      })

      create_client!(%{name: "Sem historico"})

      assert run_generate_due!() == 0
    end

    test "creates re-engagement reminder 45+ days after last sent reminder" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!()

      create_appointment!(client, professional, service, %{
        status: :concluido,
        date: Date.add(Date.utc_today(), -70)
      })

      reminder =
        ClientReminder
        |> Ash.Changeset.for_create(
          :create,
          %{
            client_id: client.id,
            kind: :agradecimento,
            due_date: Date.add(Date.utc_today(), -50),
            message: "msg",
            client_name: client.name,
            client_phone: client.phone
          },
          authorize?: false
        )
        |> Ash.create!()

      # simula um lembrete enviado há 50 dias
      reminder
      |> Ash.Changeset.for_update(
        :mark_sent,
        %{sent_at: DateTime.add(DateTime.utc_now(), -50, :day)},
        authorize?: false
      )
      |> Ash.update!()

      assert run_generate_due!() == 1

      kinds =
        ClientReminder
        |> Ash.Query.filter(client_id == ^client.id)
        |> Ash.read!(authorize?: false)
        |> Enum.map(& &1.kind)
        |> Enum.sort()

      assert kinds == [:agradecimento, :reengajamento]
    end

    test "cancels pending reminders when the client rebooks" do
      user = create_user!(:profissional)
      professional = create_professional!(user)
      service = create_service!(%{})
      client = create_client!()

      create_appointment!(client, professional, service, %{
        status: :concluido,
        date: Date.add(Date.utc_today(), -25)
      })

      assert run_generate_due!() == 1

      create_appointment!(client, professional, service, %{
        status: :agendado,
        date: Date.add(Date.utc_today(), 2)
      })

      assert run_generate_due!() == 0

      [reminder] =
        ClientReminder
        |> Ash.Query.filter(client_id == ^client.id)
        |> Ash.read!(authorize?: false)

      assert reminder.status == :cancelado
    end
  end
end
