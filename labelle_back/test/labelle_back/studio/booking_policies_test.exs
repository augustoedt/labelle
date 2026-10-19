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

  alias LabelleBack.Studio.{
    Appointment,
    AppointmentService,
    Client,
    Professional,
    Promotion,
    Service
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

  defp create_promotion!(service, attrs) do
    defaults = %{
      name: "Promo teste",
      discount_type: :value,
      discount_value: Decimal.new("10"),
      service_id: service.id,
      is_active: true
    }

    Promotion
    |> Ash.Changeset.for_create(:create, Map.merge(defaults, attrs), authorize?: false)
    |> Ash.create!()
  end

  defp salon_today do
    DateTime.utc_now() |> DateTime.add(-3 * 60 * 60, :second) |> DateTime.to_date()
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
        |> Ash.Changeset.for_create(
          :book_online,
          book_online_attrs(professional, percent_service)
        )
        |> Ash.create!()

      value_booking =
        Appointment
        |> Ash.Changeset.for_create(
          :book_online,
          Map.put(book_online_attrs(professional, value_service), :time, ~T[16:00:00])
        )
        |> Ash.create!()

      assert Decimal.equal?(percent_booking.price, Decimal.new("90.00"))
      assert Decimal.equal?(value_booking.price, Decimal.new("70"))
    end

    test "ignora promoções futuras e expiradas" do
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{price: Decimal.new("100")})
      today = salon_today()

      create_promotion!(service, %{name: "Futura", start_date: Date.add(today, 1)})
      create_promotion!(service, %{name: "Expirada", end_date: Date.add(today, -1)})

      booking =
        Appointment
        |> Ash.Changeset.for_create(:book_online, book_online_attrs(professional, service))
        |> Ash.create!()

      assert Decimal.equal?(booking.price, Decimal.new("100"))
    end

    test "escolhe a promoção elegível pelo menor UUID" do
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{price: Decimal.new("100")})

      first =
        create_promotion!(service, %{name: "Desconto 10", discount_value: Decimal.new("10")})

      second =
        create_promotion!(service, %{name: "Desconto 30", discount_value: Decimal.new("30")})

      selected = Enum.min_by([first, second], & &1.id)
      expected_price = Decimal.sub(Decimal.new("100"), selected.discount_value)

      booking =
        Appointment
        |> Ash.Changeset.for_create(:book_online, book_online_attrs(professional, service))
        |> Ash.create!()

      assert Decimal.equal?(booking.price, expected_price)
    end

    test "client_id forjado não permite copiar o telefone da cliente" do
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{})
      victim = create_client!()

      attrs =
        book_online_attrs(professional, service)
        |> Map.delete(:client_phone)
        |> Map.put(:client_id, victim.id)

      assert {:error, error} =
               Appointment
               |> Ash.Changeset.for_create(:book_online, attrs)
               |> Ash.create()

      assert inspect(error) =~ "client_phone"
      refute inspect(error) =~ victim.phone

      # Defesa em profundidade: mesmo um changeset que force o ID não pode
      # usar esse registro para preencher o telefone antes da validação.
      assert {:error, forced_error} =
               Appointment
               |> Ash.Changeset.for_create(:book_online, Map.delete(attrs, :client_id))
               |> Ash.Changeset.force_change_attribute(:client_id, victim.id)
               |> Ash.create()

      assert inspect(forced_error) =~ "client_phone"
      refute inspect(forced_error) =~ victim.phone
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

  describe "celular preenchido depois do agendamento" do
    test "manual sem telefone continua permitido; preenchimento cria e vincula cadastro sem alterar cobrança" do
      admin = create_user!(:admin)
      professional = create_professional!(create_user!(:profissional))
      service = create_service!(%{})
      apt = create_appointment!(professional, service, %{client_id: nil, client_phone: nil})
      assert is_nil(apt.client_id)

      updated =
        apt
        |> Ash.Changeset.for_update(:complete_phone, %{client_phone: "(11) 98888-1234"},
          actor: admin
        )
        |> Ash.update!()

      assert updated.client_id
      assert updated.price == apt.price
      assert updated.date == apt.date
      assert updated.status == apt.status

      again =
        updated
        |> Ash.Changeset.for_update(:complete_phone, %{client_phone: "11988881234"}, actor: admin)
        |> Ash.update!()

      assert again.client_id == updated.client_id
    end

    test "apenas admin e profissional dona podem preencher; número inválido é rejeitado" do
      owner = create_user!(:profissional)
      professional = create_professional!(owner)

      apt =
        create_appointment!(professional, create_service!(%{}), %{
          client_id: nil,
          client_phone: nil
        })

      assert {:error, _} =
               apt
               |> Ash.Changeset.for_update(:complete_phone, %{client_phone: "123"}, actor: owner)
               |> Ash.update()

      other = create_user!(:profissional)

      assert {:error, _} =
               apt
               |> Ash.Changeset.for_update(:complete_phone, %{client_phone: "11988881234"},
                 actor: other
               )
               |> Ash.update()

      assert {:error, _} =
               apt
               |> Ash.Changeset.for_update(:complete_phone, %{client_phone: "11988881234"})
               |> Ash.update()

      updated =
        apt
        |> Ash.Changeset.for_update(:complete_phone, %{client_phone: "11988881234"}, actor: owner)
        |> Ash.update!()

      assert updated.client_id
    end
  end

  describe "associação confirmada por celular" do
    test "número existente reutiliza cliente sem alterar seu nome e associa somente ids confirmados" do
      admin = create_user!(:admin)
      pro = create_professional!(create_user!(:profissional))
      service = create_service!(%{})
      client = create_client!()

      a =
        create_appointment!(pro, service, %{client_id: nil, client_phone: nil, client_name: "Ana"})

      b =
        create_appointment!(pro, service, %{
          client_id: nil,
          client_phone: nil,
          client_name: " ana "
        })

      c =
        create_appointment!(pro, service, %{client_id: nil, client_phone: nil, client_name: "Ana"})

      updated =
        a
        |> Ash.Changeset.for_update(
          :complete_phone,
          %{client_phone: client.phone, same_client_appointment_ids: [b.id]},
          actor: admin
        )
        |> Ash.update!()

      assert updated.client_id == client.id
      assert Ash.get!(Appointment, b.id, authorize?: false).client_id == client.id
      assert is_nil(Ash.get!(Appointment, c.id, authorize?: false).client_id)
      assert Ash.get!(Client, client.id, authorize?: false).name == client.name
    end

    test "grupo com nome diferente é rejeitado e reverte telefone e vínculo do principal" do
      admin = create_user!(:admin)
      pro = create_professional!(create_user!(:profissional))
      service = create_service!(%{})

      a =
        create_appointment!(pro, service, %{client_id: nil, client_phone: nil, client_name: "Ana"})

      b =
        create_appointment!(pro, service, %{
          client_id: nil,
          client_phone: nil,
          client_name: "Outra pessoa"
        })

      assert {:error, _} =
               a
               |> Ash.Changeset.for_update(
                 :complete_phone,
                 %{client_phone: "11988771234", same_client_appointment_ids: [b.id]},
                 actor: admin
               )
               |> Ash.update()

      assert is_nil(Ash.get!(Appointment, a.id, authorize?: false).client_id)
      assert is_nil(Ash.get!(Appointment, a.id, authorize?: false).client_phone)
    end

    test "profissional não associa atendimento de outra profissional e operação é revertida" do
      owner = create_user!(:profissional)
      pro = create_professional!(owner)
      other = create_professional!(create_user!(:profissional))
      service = create_service!(%{})

      a =
        create_appointment!(pro, service, %{client_id: nil, client_phone: nil, client_name: "Ana"})

      b =
        create_appointment!(other, service, %{
          client_id: nil,
          client_phone: nil,
          client_name: "Ana"
        })

      assert {:error, _} =
               a
               |> Ash.Changeset.for_update(
                 :complete_phone,
                 %{client_phone: "11988771234", same_client_appointment_ids: [b.id]},
                 actor: owner
               )
               |> Ash.update()

      assert is_nil(Ash.get!(Appointment, a.id, authorize?: false).client_id)
    end
  end

  test "upsert pelo celular normalizado não duplica nem sobrescreve cliente existente" do
    client = create_client!()

    reused =
      Client
      |> Ash.Changeset.for_create(:create, %{name: "Não sobrescrever", phone: client.phone},
        authorize?: false
      )
      |> Ash.create!(upsert?: true, upsert_identity: :unique_phone_normalized, upsert_fields: [])

    assert reused.id == client.id
    assert Ash.get!(Client, client.id, authorize?: false).name == client.name
  end

  describe "reagendamento e próxima visita" do
    test "profissional dona reagenda sem alterar cobrança; outra profissional não pode" do
      owner = create_user!(:profissional)
      pro = create_professional!(owner)
      a = create_appointment!(pro, create_service!(%{}))
      target = Date.add(Date.utc_today(), 14)

      moved =
        a
        |> Ash.Changeset.for_update(:reschedule, %{date: target, time: ~T[10:30:00]},
          actor: owner
        )
        |> Ash.update!()

      assert moved.date == target
      assert moved.time == ~T[10:30:00]
      assert moved.price == a.price
      assert moved.status == a.status
      other = create_user!(:profissional)

      assert {:error, _} =
               moved
               |> Ash.Changeset.for_update(
                 :reschedule,
                 %{date: Date.add(target, 1), time: ~T[10:30:00]},
                 actor: other
               )
               |> Ash.update()

      same =
        moved
        |> Ash.Changeset.for_update(:reschedule, %{date: target, time: ~T[10:30:00]},
          actor: owner
        )
        |> Ash.update!()

      assert same.id == a.id
    end

    test "reagendamento rejeita conflito e atendimento concluído" do
      admin = create_user!(:admin)
      pro = create_professional!(create_user!(:profissional))
      service = create_service!(%{})
      target = Date.add(Date.utc_today(), 14)
      a = create_appointment!(pro, service)
      create_appointment!(pro, service, %{date: target, time: ~T[10:00:00]})

      assert {:error, _} =
               a
               |> Ash.Changeset.for_update(:reschedule, %{date: target, time: ~T[10:30:00]},
                 actor: admin
               )
               |> Ash.update()

      concluded =
        a
        |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, authorize?: false)
        |> Ash.update!()

      assert {:error, _} =
               concluded
               |> Ash.Changeset.for_update(
                 :reschedule,
                 %{date: Date.add(target, 1), time: ~T[10:30:00]},
                 actor: admin
               )
               |> Ash.update()
    end

    test "próxima visita cria novo atendimento sem celular e preserva anterior" do
      owner = create_user!(:profissional)
      pro = create_professional!(owner)
      service = create_service!(%{})
      previous = create_appointment!(pro, service, %{client_id: nil, client_phone: nil})

      attrs = %{
        client_name: previous.client_name,
        professional_id: pro.id,
        service_id: service.id,
        date: Date.add(Date.utc_today(), 14),
        time: ~T[10:30:00]
      }

      next =
        Appointment
        |> Ash.Changeset.for_create(:book_return, attrs, actor: owner)
        |> Ash.create!()

      assert next.id != previous.id
      assert next.status == :agendado
      assert is_nil(next.client_phone)
      assert Ash.get!(Appointment, previous.id, authorize?: false).date == previous.date

      assert {:error, _} =
               Appointment
               |> Ash.Changeset.for_create(:book_return, Map.put(attrs, :time, ~T[12:00:00]))
               |> Ash.create()
    end
  end

  describe "edição administrativa de comissão" do
    test "admin altera principal e adicional concluídos sem alterar cobrança ou catálogo" do
      admin = create_user!(:admin)
      pro = create_professional!(create_user!(:profissional))
      service = create_service!(%{commission_percent: Decimal.new("40")})
      a = create_appointment!(pro, service)

      item =
        AppointmentService
        |> Ash.Changeset.for_create(:create, %{appointment_id: a.id, service_id: service.id},
          authorize?: false
        )
        |> Ash.create!()

      done =
        a
        |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, authorize?: false)
        |> Ash.update!()

      before_amounts =
        LabelleBack.Repo.query!("SELECT amount FROM transactions WHERE appointment_id = $1", [
          Ecto.UUID.dump!(a.id)
        ]).rows

      changed =
        done
        |> Ash.Changeset.for_update(:set_commission, %{commission_percent: Decimal.new("35")},
          actor: admin
        )
        |> Ash.update!()

      changed_item =
        item
        |> Ash.Changeset.for_update(:set_commission, %{commission_percent: Decimal.new("25")},
          actor: admin
        )
        |> Ash.update!()

      assert changed.commission_percent == Decimal.new("35")
      assert changed_item.commission_percent == Decimal.new("25")
      assert changed.status == :concluido
      assert changed.price == done.price

      assert Ash.get!(Service, service.id, authorize?: false).commission_percent ==
               Decimal.new("40")

      service
      |> Ash.Changeset.for_update(:update, %{commission_percent: 70}, actor: admin)
      |> Ash.update!()

      assert Ash.get!(Appointment, a.id, authorize?: false).commission_percent ==
               Decimal.new("35")

      assert Ash.get!(AppointmentService, item.id, authorize?: false).commission_percent ==
               Decimal.new("25")

      assert LabelleBack.Repo.query!(
               "SELECT amount FROM transactions WHERE appointment_id = $1",
               [Ecto.UUID.dump!(a.id)]
             ).rows == before_amounts

      assert {:error, _} =
               changed
               |> Ash.Changeset.for_update(:set_commission, %{commission_percent: 101},
                 actor: admin
               )
               |> Ash.update()

      assert {:error, _} =
               changed_item
               |> Ash.Changeset.for_update(:set_commission, %{commission_percent: -1},
                 actor: admin
               )
               |> Ash.update()
    end

    test "profissional dona e anônimo não alteram comissão em principal, adicional, serviço ou variação" do
      owner = create_user!(:profissional)
      pro = create_professional!(owner)
      service = create_service!(%{commission_percent: Decimal.new("40")})
      a = create_appointment!(pro, service)

      item =
        AppointmentService
        |> Ash.Changeset.for_create(:create, %{appointment_id: a.id, service_id: service.id},
          authorize?: false
        )
        |> Ash.create!()

      variant =
        LabelleBack.Studio.ServiceVariant
        |> Ash.Changeset.for_create(
          :create,
          %{
            service_id: service.id,
            name: "P",
            price: 100,
            duration_minutes: 60,
            commission_percent: 40
          },
          authorize?: false
        )
        |> Ash.create!()

      for actor <- [owner, nil] do
        assert {:error, _} =
                 a
                 |> Ash.Changeset.for_update(:set_commission, %{commission_percent: 90},
                   actor: actor
                 )
                 |> Ash.update()

        assert {:error, _} =
                 item
                 |> Ash.Changeset.for_update(:set_commission, %{commission_percent: 90},
                   actor: actor
                 )
                 |> Ash.update()

        assert {:error, _} =
                 service
                 |> Ash.Changeset.for_update(:update, %{commission_percent: 90}, actor: actor)
                 |> Ash.update()

        assert {:error, _} =
                 variant
                 |> Ash.Changeset.for_update(:update, %{commission_percent: 90}, actor: actor)
                 |> Ash.update()
      end

      assert Ash.get!(Appointment, a.id, authorize?: false).commission_percent ==
               Decimal.new("40")
    end
  end

  describe "gorjetas e indicação" do
    test "gorjeta é cobrada separadamente e bônus depende somente do pagamento" do
      admin = create_user!(:admin)
      pro = create_professional!(create_user!(:profissional))
      service = create_service!(%{commission_percent: Decimal.new("40")})

      for {payment, mode, input, tip, bonus} <- [
            {:pix, :amount, 12, "12", "15"},
            {:dinheiro, :percent, 10, "20", "15"},
            {:debito, :percent, 5, "10", "10"},
            {:credito, :amount, 8, "8", "10"}
          ] do
        a = create_appointment!(pro, service)

        AppointmentService
        |> Ash.Changeset.for_create(:create, %{appointment_id: a.id, service_id: service.id},
          authorize?: false
        )
        |> Ash.create!()

        done =
          a
          |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
          |> Ash.update!()
          |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
          |> Ash.update!()
          |> Ash.Changeset.for_update(
            :finalize,
            %{
              payment_method: payment,
              tip_mode: mode,
              tip_input: input,
              professional_referral: true
            },
            actor: admin
          )
          |> Ash.update!()

        assert Decimal.equal?(done.commission_percent, Decimal.new("40"))
        assert Decimal.equal?(done.tip_amount, Decimal.new(tip))
        assert Decimal.equal?(done.referral_bonus_percent, Decimal.new(bonus))

        [[charged]] =
          LabelleBack.Repo.query!("SELECT amount FROM transactions WHERE appointment_id = $1", [
            Ecto.UUID.dump!(a.id)
          ]).rows

        assert Decimal.equal?(charged, Decimal.add(Decimal.new(200), Decimal.new(tip)))
      end
    end

    test "profissional não pode marcar indicação nem alterar taxa, mas registra gorjeta" do
      user = create_user!(:profissional)
      pro = create_professional!(user)
      service = create_service!(%{commission_percent: Decimal.new("30")})

      a =
        create_appointment!(pro, service)
        |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
        |> Ash.update!()

      assert {:error, _} =
               a
               |> Ash.Changeset.for_update(
                 :finalize,
                 %{payment_method: :pix, professional_referral: true},
                 actor: user
               )
               |> Ash.update()

      assert {:error, _} =
               a
               |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix, tip_input: -1},
                 actor: user
               )
               |> Ash.update()

      done =
        a
        |> Ash.Changeset.for_update(
          :finalize,
          %{payment_method: :credito, tip_mode: :percent, tip_input: 10},
          actor: user
        )
        |> Ash.update!()

      assert Decimal.equal?(done.commission_percent, Decimal.new(30))
      assert Decimal.equal?(done.referral_bonus_percent, Decimal.new(0))
      assert Decimal.equal?(done.tip_amount, Decimal.new(10))

      assert {:error, _} =
               done
               |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix, tip_input: 50},
                 actor: user
               )
               |> Ash.update()
    end
  end

  describe "edição financeira com histórico e memória de indicação" do
    test "alterar preço e comissão após concluir sincroniza cobrança e preserva auditoria" do
      admin = create_user!(:admin)
      pro = create_professional!(create_user!(:profissional))
      service = create_service!(%{commission_percent: Decimal.new(40)})

      a =
        create_appointment!(pro, service)
        |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(
          :finalize,
          %{payment_method: :pix, tip_mode: :percent, tip_input: 10},
          actor: admin
        )
        |> Ash.update!()

      changed =
        a
        |> Ash.Changeset.for_update(
          :edit_financial,
          %{price: 200, commission_percent: 50, edit_comment: "Ajuste acordado com a cliente"},
          actor: admin
        )
        |> Ash.update!()

      assert Decimal.equal?(changed.tip_amount, Decimal.new(20))

      [[amount]] =
        LabelleBack.Repo.query!("SELECT amount FROM transactions WHERE appointment_id = $1", [
          Ecto.UUID.dump!(a.id)
        ]).rows

      assert Decimal.equal?(amount, Decimal.new(220))
      [entry] = Ash.read!(LabelleBack.Studio.FinancialEdit, actor: admin)
      assert entry.comment == "Ajuste acordado com a cliente"
      assert entry.actor_id == admin.id
      assert entry.old_values["price"] == "100"
      assert entry.new_values["price"] == "200"
      assert entry.old_values["commission_percent"] == "40"
      assert entry.new_values["commission_percent"] == "50"

      assert {:error, _} =
               changed
               |> Ash.Changeset.for_update(:edit_financial, %{price: -1}, actor: admin)
               |> Ash.update()

      assert length(Ash.read!(LabelleBack.Studio.FinancialEdit, actor: admin)) == 1

      item =
        AppointmentService
        |> Ash.Changeset.for_create(:create, %{appointment_id: a.id, service_id: service.id},
          actor: admin
        )
        |> Ash.create!()

      item =
        item
        |> Ash.Changeset.for_update(
          :edit_financial,
          %{price: 50, commission_percent: 25, edit_comment: "  "},
          actor: admin
        )
        |> Ash.update!()

      [[amount, count]] =
        LabelleBack.Repo.query!(
          "SELECT sum(amount), count(*) FROM transactions WHERE appointment_id = $1",
          [Ecto.UUID.dump!(a.id)]
        ).rows

      assert count == 1
      assert Decimal.equal?(amount, Decimal.new(275))

      pending =
        Ash.read!(LabelleBack.Studio.FinancialEdit, actor: admin)
        |> Enum.find(&(&1.record_id == item.id && &1.action_name == "edit_financial"))

      assert is_nil(pending.comment)

      filled =
        pending
        |> Ash.Changeset.for_update(:add_comment, %{comment: "Correção do adicional"},
          actor: admin
        )
        |> Ash.update!()

      assert filled.old_values == pending.old_values
      assert filled.comment == "Correção do adicional"
      assert filled.commented_by == admin.id

      item
      |> Ash.Changeset.for_destroy(:destroy, %{edit_comment: "Item incluído por engano"},
        actor: admin
      )
      |> Ash.destroy!()

      [[amount]] =
        LabelleBack.Repo.query!("SELECT amount FROM transactions WHERE appointment_id = $1", [
          Ecto.UUID.dump!(a.id)
        ]).rows

      assert Decimal.equal?(amount, Decimal.new(220))
    end

    test "profissional não altera concluído, histórico ou indicação; memória é por cliente e profissional" do
      admin = create_user!(:admin)
      user = create_user!(:profissional)
      pro = create_professional!(user)
      other = create_professional!(create_user!(:profissional))
      service = create_service!(%{commission_percent: Decimal.new(40)})
      client = create_client!()

      first =
        create_appointment!(pro, service, %{client_id: client.id})
        |> Ash.Changeset.for_update(:update, %{professional_referral: true}, actor: admin)
        |> Ash.update!()

      assert Ash.get!(Client, client.id, actor: admin).referring_professional_id == pro.id
      again = create_appointment!(pro, service, %{client_id: client.id})
      assert again.professional_referral
      different = create_appointment!(other, service, %{client_id: client.id})
      refute different.professional_referral

      assert {:error, _} =
               Appointment
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   client_name: client.name,
                   client_id: client.id,
                   professional_id: pro.id,
                   service_id: service.id,
                   date: Date.utc_today(),
                   time: ~T[15:00:00],
                   professional_referral: true
                 },
                 actor: user
               )
               |> Ash.create()

      done =
        first
        |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:finalize, %{payment_method: :credito}, actor: user)
        |> Ash.update!()

      assert Decimal.equal?(done.referral_bonus_percent, Decimal.new(10))

      assert {:error, _} =
               done
               |> Ash.Changeset.for_update(:edit_financial, %{price: 1, commission_percent: 99},
                 actor: user
               )
               |> Ash.update()

      assert {:error, _} =
               AppointmentService
               |> Ash.Changeset.for_create(
                 :create,
                 %{appointment_id: done.id, service_id: service.id},
                 actor: user
               )
               |> Ash.create()

      corrected =
        done
        |> Ash.Changeset.for_update(:edit_financial, %{commission_percent: 35}, actor: admin)
        |> Ash.update!()

      [entry] = Ash.read!(LabelleBack.Studio.FinancialEdit, actor: admin)

      assert [] == Ash.read!(LabelleBack.Studio.FinancialEdit, actor: user)

      assert {:error, _} =
               entry
               |> Ash.Changeset.for_update(:add_comment, %{comment: "Ocultar pendência"},
                 actor: user
               )
               |> Ash.update()

      assert [] == Ash.read!(LabelleBack.Studio.FinancialEdit, actor: user)
      assert Decimal.equal?(corrected.commission_percent, Decimal.new(35))

      again
      |> Ash.Changeset.for_update(:update, %{professional_referral: false}, actor: admin)
      |> Ash.update!()

      assert is_nil(Ash.get!(Client, client.id, actor: admin).referring_professional_id)
      refute create_appointment!(pro, service, %{client_id: client.id}).professional_referral
    end
  end

  test "reconciliação corrige somente cobrança paga divergente e não duplica ajustes" do
    admin = create_user!(:admin)
    pro = create_professional!(create_user!(:profissional))
    service = create_service!(%{commission_percent: Decimal.new(40)})

    a =
      create_appointment!(pro, service)
      |> Ash.Changeset.for_update(:confirm, %{}, authorize?: false)
      |> Ash.update!()
      |> Ash.Changeset.for_update(:start, %{}, authorize?: false)
      |> Ash.update!()
      |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, actor: admin)
      |> Ash.update!()

    LabelleBack.Repo.query!("UPDATE transactions SET amount = 60 WHERE appointment_id = $1", [
      Ecto.UUID.dump!(a.id)
    ])

    [candidate] = LabelleBack.Studio.FinancialReconciliation.preview()
    assert Decimal.equal?(candidate.old_amount, Decimal.new(60))
    assert Decimal.equal?(candidate.new_amount, Decimal.new(100))
    assert length(LabelleBack.Studio.FinancialReconciliation.run!()) == 1
    assert [] == LabelleBack.Studio.FinancialReconciliation.run!()
    [entry] = Ash.read!(LabelleBack.Studio.FinancialEdit, actor: admin)
    assert entry.action_name == "reconcile_charge"
    refute is_nil(entry.comment)

    LabelleBack.Repo.query!("DELETE FROM transactions WHERE appointment_id = $1", [
      Ecto.UUID.dump!(a.id)
    ])

    a
    |> Ash.Changeset.for_update(:set_commission, %{commission_percent: 35}, actor: admin)
    |> Ash.update!()

    assert [] ==
             LabelleBack.Repo.query!("SELECT id FROM transactions WHERE appointment_id = $1", [
               Ecto.UUID.dump!(a.id)
             ]).rows
  end

  describe "serviços com profissionais diferentes" do
    test "adicionais simultâneos para outra e para a mesma profissional preservam autoria e cobrança" do
      admin = create_user!(:admin)
      user = create_user!(:profissional)
      owner = create_professional!(user)
      other_user = create_user!(:profissional)
      other = create_professional!(other_user)
      stranger = create_user!(:profissional)
      create_professional!(stranger)
      service = create_service!(%{commission_percent: Decimal.new(40)})

      LabelleBack.Studio.ProfessionalService
      |> Ash.Changeset.for_create(:create, %{professional_id: other.id, service_id: service.id},
        authorize?: false
      )
      |> Ash.create!()

      a = create_appointment!(owner, service, %{time: ~T[11:00:00]})

      additional =
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{appointment_id: a.id, professional_id: other.id, service_id: service.id},
          actor: admin
        )
        |> Ash.create!()

      own =
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{appointment_id: a.id, professional_id: owner.id, service_id: service.id},
          actor: admin
        )
        |> Ash.create!()

      again =
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{appointment_id: a.id, professional_id: owner.id, service_id: service.id},
          actor: admin
        )
        |> Ash.create!()

      assert additional.professional_id == other.id
      assert additional.professional_name == other.name
      assert own.professional_id == owner.id && again.professional_id == owner.id
      assert Ash.get!(Appointment, a.id, actor: other_user).id == a.id

      assert [additional.id] ==
               Ash.read!(AppointmentService, actor: other_user) |> Enum.map(& &1.id)

      assert [] == Ash.read!(Appointment, actor: stranger)

      assert {:error, _} =
               a |> Ash.Changeset.for_update(:confirm, %{}, actor: other_user) |> Ash.update()

      assert {:error, _} =
               additional
               |> Ash.Changeset.for_update(:set_commission, %{commission_percent: 90},
                 actor: other_user
               )
               |> Ash.update()

      assert {:ok, by_owner} =
               AppointmentService
               |> Ash.Changeset.for_create(
                 :create,
                 %{appointment_id: a.id, professional_id: other.id, service_id: service.id},
                 actor: user
               )
               |> Ash.create()

      assert by_owner.professional_id == other.id
      assert Decimal.equal?(by_owner.commission_percent, Decimal.new(40))

      assert {:error, _} =
               by_owner
               |> Ash.Changeset.for_update(:set_commission, %{commission_percent: 90},
                 actor: user
               )
               |> Ash.update()

      done =
        a
        |> Ash.Changeset.for_update(:confirm, %{}, actor: user)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, actor: user)
        |> Ash.update!()
        |> Ash.Changeset.for_update(
          :finalize,
          %{payment_method: :pix, professional_referral: true},
          actor: admin
        )
        |> Ash.update!()

      assert Decimal.equal?(done.referral_bonus_percent, Decimal.new(15))

      [[amount]] =
        LabelleBack.Repo.query!("SELECT amount FROM transactions WHERE appointment_id = $1", [
          Ecto.UUID.dump!(a.id)
        ]).rows

      assert Decimal.equal?(amount, Decimal.new(500))

      extra =
        AppointmentService
        |> Ash.Changeset.for_create(
          :create,
          %{
            appointment_id: a.id,
            professional_id: other.id,
            service_id: service.id,
            edit_comment: "Serviço realizado pela segunda profissional"
          },
          actor: admin
        )
        |> Ash.create!()

      assert extra.professional_id == other.id

      [[amount]] =
        LabelleBack.Repo.query!("SELECT amount FROM transactions WHERE appointment_id = $1", [
          Ecto.UUID.dump!(a.id)
        ]).rows

      assert Decimal.equal?(amount, Decimal.new(600))
      assert length(Ash.read!(LabelleBack.Studio.FinancialEdit, actor: admin)) == 1
    end

    test "adicional reserva o horário de quem executa e bloqueia outra cliente" do
      admin = create_user!(:admin)
      owner = create_professional!(create_user!(:profissional))
      other = create_professional!(create_user!(:profissional))
      service = create_service!(%{})

      LabelleBack.Studio.ProfessionalService
      |> Ash.Changeset.for_create(:create, %{professional_id: other.id, service_id: service.id},
        authorize?: false
      )
      |> Ash.create!()

      date = Date.add(Date.utc_today(), 5)
      a = create_appointment!(owner, service, %{date: date, time: ~T[10:00:00]})

      AppointmentService
      |> Ash.Changeset.for_create(
        :create,
        %{appointment_id: a.id, professional_id: other.id, service_id: service.id},
        actor: admin
      )
      |> Ash.create!()

      assert LabelleBack.Studio.ProfessionalSchedule.conflict?(
               other.id,
               date,
               ~T[10:00:00],
               60,
               nil
             )

      refute LabelleBack.Studio.ProfessionalSchedule.conflict?(
               other.id,
               date,
               ~T[10:00:00],
               60,
               a.id
             )

      assert {:ok, slots} = LabelleBack.Studio.available_slots(other.id, date, authorize?: false)
      refute "10:00" in slots
      conflict = create_appointment!(owner, service, %{date: date, time: ~T[10:00:00]})

      assert {:error, _} =
               AppointmentService
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   appointment_id: conflict.id,
                   professional_id: other.id,
                   service_id: service.id
                 },
                 actor: admin
               )
               |> Ash.create()

      same_client =
        create_appointment!(owner, service, %{
          date: date,
          time: ~T[10:00:00],
          client_id: a.client_id
        })

      assert {:ok, _} =
               AppointmentService
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   appointment_id: same_client.id,
                   professional_id: other.id,
                   service_id: service.id
                 },
                 actor: admin
               )
               |> Ash.create()
    end
  end

  test "reagendamento considera também o conflito da profissional do adicional" do
    admin = create_user!(:admin)
    owner = create_professional!(create_user!(:profissional))
    other = create_professional!(create_user!(:profissional))
    service = create_service!(%{})

    LabelleBack.Studio.ProfessionalService
    |> Ash.Changeset.for_create(:create, %{professional_id: other.id, service_id: service.id},
      authorize?: false
    )
    |> Ash.create!()

    date = Date.add(Date.utc_today(), 5)
    a = create_appointment!(owner, service, %{date: date, time: ~T[10:00:00]})

    AppointmentService
    |> Ash.Changeset.for_create(
      :create,
      %{appointment_id: a.id, professional_id: other.id, service_id: service.id},
      actor: admin
    )
    |> Ash.create!()

    create_appointment!(other, service, %{date: date, time: ~T[14:00:00]})

    assert {:error, _} =
             a
             |> Ash.Changeset.for_update(:reschedule, %{date: date, time: ~T[14:00:00]},
               actor: admin
             )
             |> Ash.update()

    assert Ash.get!(Appointment, a.id, actor: admin).time == ~T[10:00:00]

    assert {:ok, moved} =
             a
             |> Ash.Changeset.for_update(:reschedule, %{date: date, time: ~T[12:00:00]},
               actor: admin
             )
             |> Ash.update()

    assert moved.time == ~T[12:00:00]
  end

  test "indicação acompanha a identidade da cliente mesmo quando quem indicou executa só o adicional" do
    admin = create_user!(:admin)
    referrer = create_professional!(create_user!(:profissional))
    principal = create_professional!(create_user!(:profissional))
    service = create_service!(%{commission_percent: Decimal.new(40)})

    LabelleBack.Studio.ProfessionalService
    |> Ash.Changeset.for_create(:create, %{professional_id: referrer.id, service_id: service.id},
      authorize?: false
    )
    |> Ash.create!()

    client =
      create_client!()
      |> Ash.Changeset.for_update(:set_referrer, %{referring_professional_id: referrer.id},
        actor: admin
      )
      |> Ash.update!()

    a = create_appointment!(principal, service, %{client_id: client.id})
    refute a.professional_referral
    assert a.referral_professional_id == referrer.id

    AppointmentService
    |> Ash.Changeset.for_create(
      :create,
      %{appointment_id: a.id, professional_id: referrer.id, service_id: service.id},
      actor: admin
    )
    |> Ash.create!()

    done =
      a
      |> Ash.Changeset.for_update(:confirm, %{}, actor: admin)
      |> Ash.update!()
      |> Ash.Changeset.for_update(:start, %{}, actor: admin)
      |> Ash.update!()
      |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, actor: admin)
      |> Ash.update!()

    assert done.referral_professional_id == referrer.id
    assert Decimal.equal?(done.referral_bonus_percent, Decimal.new(15))
  end

  test "admin pode retirar indicação ao agendar sem deixar bônus residual" do
    admin = create_user!(:admin)
    professional = create_professional!(create_user!(:profissional))
    service = create_service!(%{})

    client =
      create_client!()
      |> Ash.Changeset.for_update(:set_referrer, %{referring_professional_id: professional.id},
        actor: admin
      )
      |> Ash.update!()

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
          time: ~T[16:00:00],
          professional_referral: false
        },
        actor: admin
      )
      |> Ash.create!()

    refute appointment.professional_referral
    assert is_nil(appointment.referral_professional_id)
    assert is_nil(Ash.get!(Client, client.id, actor: admin).referring_professional_id)

    done =
      appointment
      |> Ash.Changeset.for_update(:confirm, %{}, actor: admin)
      |> Ash.update!()
      |> Ash.Changeset.for_update(:start, %{}, actor: admin)
      |> Ash.update!()
      |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, actor: admin)
      |> Ash.update!()

    assert Decimal.equal?(done.referral_bonus_percent, Decimal.new(0))
  end
end
