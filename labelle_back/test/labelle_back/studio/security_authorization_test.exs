defmodule LabelleBack.Studio.SecurityAuthorizationTest do
  use LabelleBack.DataCase, async: true
  @endpoint LabelleBackWeb.Endpoint

  alias LabelleBack.Studio.{Appointment, AppointmentService, Professional, Service}
  require Ash.Query

  defp user!(role) do
    LabelleBack.Accounts.User
    |> Ash.Changeset.for_create(
      :register_with_password,
      %{
        email: "security-#{System.unique_integer([:positive])}@test.com",
        password: "TestOnlyPassword123!",
        password_confirmation: "TestOnlyPassword123!"
      },
      authorize?: false
    )
    |> Ash.create!()
    |> Ash.Changeset.for_update(:update, %{role: role}, authorize?: false)
    |> Ash.update!()
  end

  defp professional!(user, name \\ "Profissional") do
    Professional
    |> Ash.Changeset.for_create(
      :create,
      %{
        name: name,
        phone: "11999990000",
        email: "internal@test.com",
        type: :aluguel,
        commission_percent: Decimal.new("35"),
        rent_value: Decimal.new("500"),
        user_id: user.id
      },
      authorize?: false
    )
    |> Ash.create!()
  end

  defp service! do
    Service
    |> Ash.Changeset.for_create(
      :create,
      %{
        name: "Serviço Teste",
        category: :cabelo,
        price: Decimal.new("100"),
        duration_minutes: 60
      },
      authorize?: false
    )
    |> Ash.create!()
  end

  defp appointment!(professional, service) do
    Appointment
    |> Ash.Changeset.for_create(
      :create,
      %{
        client_name: "Cliente Teste",
        professional_id: professional.id,
        service_id: service.id,
        date: Date.add(Date.utc_today(), 1),
        time: ~T[10:00:00]
      },
      authorize?: false
    )
    |> Ash.create!()
  end

  test "A1: público e outra profissional não leem dados internos; admin e titular leem" do
    owner = user!(:profissional)
    other = user!(:profissional)
    admin = user!(:admin)
    professional = professional!(owner)

    for actor <- [nil, other] do
      [visible] =
        Professional |> Ash.Query.filter(id == ^professional.id) |> Ash.read!(actor: actor)

      assert visible.name == professional.name

      for field <- [:phone, :email, :type, :commission_percent, :rent_value, :user_id] do
        assert match?(%Ash.ForbiddenField{}, Map.fetch!(visible, field))
      end
    end

    for actor <- [owner, admin] do
      [visible] =
        Professional |> Ash.Query.filter(id == ^professional.id) |> Ash.read!(actor: actor)

      assert visible.phone == professional.phone
      assert visible.user_id == owner.id
      assert Decimal.equal?(visible.rent_value, Decimal.new("500"))
    end

    import Plug.Conn
    import Phoenix.ConnTest

    conn =
      build_conn()
      |> put_req_header("accept", "application/vnd.api+json")
      |> get("/api/json/professionals")

    assert conn.status == 200, conn.resp_body

    public =
      conn.resp_body
      |> Jason.decode!()
      |> Map.fetch!("data")
      |> Enum.find(&(&1["id"] == professional.id))

    assert public["attributes"]["name"] == professional.name
    refute String.contains?(conn.resp_body, professional.phone)
    refute String.contains?(conn.resp_body, owner.id)
    refute String.contains?(conn.resp_body, "internal@test.com")
    refute String.contains?(conn.resp_body, "rent_value")
    refute String.contains?(conn.resp_body, "commission_percent")
  end

  test "A3: profissional não reatribui nem altera preços de agendamentos existentes" do
    owner = user!(:profissional)
    admin = user!(:admin)
    professional = professional!(owner)
    another = professional!(user!(:profissional), "Outra")
    service = service!()
    appointment = appointment!(professional, service)

    for attrs <- [%{price: Decimal.new("1")}, %{professional_id: another.id}] do
      assert_raise Ash.Error.Forbidden, fn ->
        appointment
        |> Ash.Changeset.for_update(:update, attrs, actor: owner)
        |> Ash.update!()
      end
    end

    updated =
      appointment
      |> Ash.Changeset.for_update(:update, %{price: Decimal.new("70")}, actor: admin)
      |> Ash.update!()

    assert Decimal.equal?(updated.price, Decimal.new("70"))
    assert updated.professional_id == professional.id
  end

  test "A3: criação profissional usa preço do catálogo e não aceita preço manual" do
    owner = user!(:profissional)
    professional = professional!(owner)
    service = service!()

    attrs = %{
      client_name: "Cliente Teste",
      professional_id: professional.id,
      service_id: service.id,
      date: Date.add(Date.utc_today(), 1),
      time: ~T[10:00:00]
    }

    assert {:error, %Ash.Error.Invalid{}} =
             Appointment
             |> Ash.Changeset.for_create(:create, Map.put(attrs, :price, Decimal.new("1")),
               actor: owner
             )
             |> Ash.create()

    appointment =
      Appointment |> Ash.Changeset.for_create(:create, attrs, actor: owner) |> Ash.create!()

    assert Decimal.equal?(appointment.price, Decimal.new("100"))

    item_attrs = %{appointment_id: appointment.id, service_id: service.id}

    assert {:error, %Ash.Error.Invalid{}} =
             AppointmentService
             |> Ash.Changeset.for_create(:create, Map.put(item_attrs, :price, Decimal.new("1")),
               actor: owner
             )
             |> Ash.create()

    item =
      AppointmentService
      |> Ash.Changeset.for_create(:create, item_attrs, actor: owner)
      |> Ash.create!()

    assert Decimal.equal?(item.price, Decimal.new("100"))

    assert_raise Ash.Error.Forbidden, fn ->
      item
      |> Ash.Changeset.for_update(:update, %{price: Decimal.new("1")}, actor: owner)
      |> Ash.update!()
    end

    item =
      item
      |> Ash.Changeset.for_update(:update, %{price: Decimal.new("70")}, actor: user!(:admin))
      |> Ash.update!()

    assert Decimal.equal?(item.price, Decimal.new("70"))
  end
end
