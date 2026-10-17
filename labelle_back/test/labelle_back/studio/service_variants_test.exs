defmodule LabelleBack.Studio.ServiceVariantsTest do
  use LabelleBack.DataCase, async: true
  @endpoint LabelleBackWeb.Endpoint

  alias LabelleBack.Studio.{
    Appointment,
    Service,
    ServiceVariant,
    Professional,
    ProfessionalService
  }

  setup do
    LabelleBack.Studio.Settings
    |> Ash.Changeset.for_create(
      :create,
      %{
        name: "La Belle Teste",
        whatsapp_phone: "83999990000",
        message_confirmation: "Confirmação {{cliente}}",
        message_reminder: "Lembrete {{cliente}}",
        message_thank_you: "Obrigada {{cliente}}",
        message_reengagement: "Retorno {{cliente}}",
        message_new_booking_notification: "Solicitação recebida {{cliente}}"
      },
      authorize?: false
    )
    |> Ash.create!()

    service =
      Service
      |> Ash.Changeset.for_create(
        :create,
        %{name: "Escova", category: :cabelo, price: 30, duration_minutes: 20},
        authorize?: false
      )
      |> Ash.create!()

    variant =
      ServiceVariant
      |> Ash.Changeset.for_create(
        :create,
        %{
          service_id: service.id,
          name: "G",
          price: 60,
          duration_minutes: 40,
          commission_percent: 40
        },
        authorize?: false
      )
      |> Ash.create!()

    professional =
      Professional
      |> Ash.Changeset.for_create(:create, %{name: "Maria", phone: "83999990000"},
        authorize?: false
      )
      |> Ash.create!()

    ProfessionalService
    |> Ash.Changeset.for_create(
      :create,
      %{service_id: service.id, professional_id: professional.id},
      authorize?: false
    )
    |> Ash.create!()

    {:ok, service: service, variant: variant, professional: professional}
  end

  defp attrs(context, extra \\ %{}) do
    Map.merge(
      %{
        client_name: "Cliente",
        client_phone: "83988880000",
        service_id: context.service.id,
        service_variant_id: context.variant.id,
        professional_id: context.professional.id,
        date: Date.add(Date.utc_today(), 2),
        time: ~T[14:00:00]
      },
      extra
    )
  end

  test "online booking snapshots variation and keeps it after price changes", context do
    booking =
      Appointment |> Ash.Changeset.for_create(:book_online, attrs(context)) |> Ash.create!()

    assert booking.service_name == "Escova — G"
    assert booking.variant_name == "G"
    assert Decimal.equal?(booking.price, 60)
    assert booking.duration_minutes == 40
    assert Decimal.equal?(booking.commission_percent, 40)
    assert booking.status == :agendado
    assert booking.client_id != nil

    assert {:error, _} =
             Appointment
             |> Ash.Changeset.for_create(
               :book_online,
               attrs(context, %{price: 1, time: ~T[16:00:00]})
             )
             |> Ash.create()

    context.variant
    |> Ash.Changeset.for_update(:update, %{price: 80}, authorize?: false)
    |> Ash.update!()

    updated =
      booking
      |> Ash.Changeset.for_update(:update, %{notes: "Observação"}, authorize?: false)
      |> Ash.update!()

    assert Decimal.equal?(updated.price, 60)
  end

  test "rejects missing, inactive and foreign variation", context do
    assert {:error, _} =
             Appointment
             |> Ash.Changeset.for_create(:book_online, attrs(context, %{service_variant_id: nil}))
             |> Ash.create()

    other =
      Service
      |> Ash.Changeset.for_create(
        :create,
        %{name: "Outro", category: :cabelo, price: 90, duration_minutes: 50},
        authorize?: false
      )
      |> Ash.create!()

    assert {:error, _} =
             Appointment
             |> Ash.Changeset.for_create(:book_online, attrs(context, %{service_id: other.id}))
             |> Ash.create()

    context.variant
    |> Ash.Changeset.for_update(:update, %{is_active: false}, authorize?: false)
    |> Ash.update!()

    assert {:error, _} =
             Appointment |> Ash.Changeset.for_create(:book_online, attrs(context)) |> Ash.create()
  end

  test "40 minute booking blocks an overlapping slot and closing time", context do
    Appointment |> Ash.Changeset.for_create(:book_online, attrs(context)) |> Ash.create!()

    assert {:error, _} =
             Appointment
             |> Ash.Changeset.for_create(:book_online, attrs(context, %{time: ~T[14:30:00]}))
             |> Ash.create()

    assert {:error, _} =
             Appointment
             |> Ash.Changeset.for_create(:book_online, attrs(context, %{time: ~T[17:30:00]}))
             |> Ash.create()

    assert {:ok, _} =
             Appointment
             |> Ash.Changeset.for_create(:book_online, attrs(context, %{time: ~T[15:00:00]}))
             |> Ash.create()
  end

  test "variant commercial data can only be changed by administrators", context do
    assert {:error, _} =
             context.variant |> Ash.Changeset.for_update(:update, %{price: 1}) |> Ash.update()

    assert {:error, _} =
             ServiceVariant
             |> Ash.Changeset.for_create(:create, %{
               service_id: context.service.id,
               name: "P",
               price: 20,
               duration_minutes: 20
             })
             |> Ash.create()
  end

  test "service and nested variants are saved atomically", context do
    updated =
      context.service
      |> Ash.Changeset.for_update(
        :update,
        %{variants: [%{id: context.variant.id, name: "G", price: 65, duration_minutes: 45}]},
        authorize?: false
      )
      |> Ash.update!()

    assert updated.id == context.service.id

    assert Decimal.equal?(
             Ash.get!(ServiceVariant, context.variant.id, authorize?: false).price,
             65
           )

    assert {:error, _} =
             context.service
             |> Ash.Changeset.for_update(
               :update,
               %{name: "Não salvar", variants: [%{id: context.variant.id, price: -1}]},
               authorize?: false
             )
             |> Ash.update()

    assert Ash.get!(Service, context.service.id, authorize?: false).name == "Escova"
  end

  test "JSON API saves nested options for admin and rejects anonymous writes" do
    import Plug.Conn
    import Phoenix.ConnTest
    email = "catalog-#{System.unique_integer([:positive])}@test.com"
    password = "test-password-123"

    user =
      LabelleBack.Accounts.User
      |> Ash.Changeset.for_create(
        :register_with_password,
        %{email: email, password: password, password_confirmation: password},
        authorize?: false
      )
      |> Ash.create!()

    user |> Ash.Changeset.for_update(:update, %{role: :admin}, authorize?: false) |> Ash.update!()

    {:ok, signed_in} =
      LabelleBack.Accounts.sign_in_with_password(email, password, authorize?: false)

    attributes = %{
      name: "Escova teste API",
      category: "cabelo",
      price: 60,
      duration_minutes: 40,
      variants: [%{name: "G", price: 60, duration_minutes: 40, commission_percent: 40}]
    }

    conn =
      build_conn()
      |> put_req_header("content-type", "application/vnd.api+json")
      |> put_req_header("accept", "application/vnd.api+json")
      |> put_req_header("authorization", "Bearer #{signed_in.__metadata__.token}")
      |> post(
        "/api/json/services",
        Jason.encode!(%{data: %{type: "service", attributes: attributes}})
      )

    assert conn.status == 201, conn.resp_body
    id = Jason.decode!(conn.resp_body)["data"]["id"]
    require Ash.Query

    assert [%{name: "G"}] =
             ServiceVariant |> Ash.Query.filter(service_id == ^id) |> Ash.read!(authorize?: false)

    anonymous =
      build_conn()
      |> put_req_header("content-type", "application/vnd.api+json")
      |> post(
        "/api/json/services",
        Jason.encode!(%{data: %{type: "service", attributes: attributes}})
      )

    assert anonymous.status == 403
  end

  test "additional items use the same variation pricing as the main booking", context do
    booking =
      Appointment
      |> Ash.Changeset.for_create(:create, attrs(context), authorize?: false)
      |> Ash.create!()

    item =
      LabelleBack.Studio.AppointmentService
      |> Ash.Changeset.for_create(
        :create,
        %{
          appointment_id: booking.id,
          service_id: context.service.id,
          service_variant_id: context.variant.id
        },
        authorize?: false
      )
      |> Ash.create!()

    assert item.service_name == "Escova — G"
    assert Decimal.equal?(item.price, 60)
    assert item.duration_minutes == 40
    assert Decimal.equal?(item.commission_percent, 40)
  end
end
