defmodule LabelleBack.Studio.ProfessionalRemovalTest do
  use LabelleBack.DataCase, async: true
  @endpoint LabelleBackWeb.Endpoint

  import Plug.Conn
  import Phoenix.ConnTest
  require Ash.Query

  alias LabelleBack.Studio.{Appointment, Professional, ProfessionalService, Service, Transaction}

  defp user!(role) do
    email = "professional-removal-#{System.unique_integer([:positive])}@test.com"
    password = "TestOnlyPassword123!"

    user =
      LabelleBack.Accounts.User
      |> Ash.Changeset.for_create(
        :register_with_password,
        %{email: email, password: password, password_confirmation: password},
        authorize?: false
      )
      |> Ash.create!()
      |> Ash.Changeset.for_update(:update, %{role: role}, authorize?: false)
      |> Ash.update!()

    {:ok, signed_in} =
      LabelleBack.Accounts.sign_in_with_password(email, password, authorize?: false)

    {user, signed_in.__metadata__.token}
  end

  defp professional!(owner) do
    Professional
    |> Ash.Changeset.for_create(
      :create,
      %{name: "Profissional preservada", phone: "11999990000", user_id: owner.id},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp request(method, professional, token, attrs \\ %{}) do
    conn =
      build_conn()
      |> put_req_header("accept", "application/vnd.api+json")
      |> put_req_header("content-type", "application/vnd.api+json")

    conn = if token, do: put_req_header(conn, "authorization", "Bearer #{token}"), else: conn
    path = "/api/json/professionals/#{professional.id}"

    case method do
      :delete ->
        delete(conn, path)

      :patch ->
        patch(
          conn,
          path,
          Jason.encode!(%{data: %{type: "professional", id: professional.id, attributes: attrs}})
        )
    end
  end

  test "DELETE and activation changes reject anonymous users and professionals, including the owner" do
    {owner, owner_token} = user!(:profissional)
    {_other, other_token} = user!(:profissional)
    professional = professional!(owner)

    for token <- [nil, owner_token, other_token] do
      deleted = request(:delete, professional, token)
      assert deleted.status == 403, deleted.resp_body

      deactivated = request(:patch, professional, token, %{is_active: false})
      assert deactivated.status == 403, deactivated.resp_body
      assert Ash.get!(Professional, professional.id, authorize?: false).is_active
    end
  end

  test "admin deactivation and DELETE preserve bookings, completed services, receipts and service links" do
    {admin, admin_token} = user!(:admin)
    {owner, _owner_token} = user!(:profissional)
    professional = professional!(owner)

    service =
      Service
      |> Ash.Changeset.for_create(
        :create,
        %{name: "Serviço preservado", category: :cabelo, price: 100, duration_minutes: 60},
        actor: admin
      )
      |> Ash.create!()

    link =
      ProfessionalService
      |> Ash.Changeset.for_create(
        :create,
        %{professional_id: professional.id, service_id: service.id},
        actor: admin
      )
      |> Ash.create!()

    scheduled =
      Appointment
      |> Ash.Changeset.for_create(
        :create,
        %{
          client_name: "Cliente agendada",
          professional_id: professional.id,
          service_id: service.id,
          date: Date.add(Date.utc_today(), 1),
          time: ~T[10:00:00]
        },
        actor: admin
      )
      |> Ash.create!()

    completed =
      Appointment
      |> Ash.Changeset.for_create(
        :create,
        %{
          client_name: "Cliente atendida",
          professional_id: professional.id,
          service_id: service.id,
          date: Date.utc_today(),
          time: ~T[11:00:00]
        },
        actor: admin
      )
      |> Ash.create!()
      |> Ash.Changeset.for_update(:start, %{}, actor: admin)
      |> Ash.update!()
      |> Ash.Changeset.for_update(:finalize, %{payment_method: :pix}, actor: admin)
      |> Ash.update!()

    [receipt] =
      Transaction |> Ash.Query.filter(appointment_id == ^completed.id) |> Ash.read!(actor: admin)

    # A interface usa PATCH para desativar, inclusive durante o rollout do backend.
    deactivated = request(:patch, professional, admin_token, %{is_active: false})
    assert deactivated.status == 200, deactivated.resp_body
    refute Ash.get!(Professional, professional.id, actor: admin).is_active
    assert Ash.get!(Appointment, scheduled.id, actor: admin).professional_id == professional.id
    assert Ash.get!(Appointment, completed.id, actor: admin).status == :concluido
    assert Ash.get!(ProfessionalService, link.id, actor: admin).professional_id == professional.id
    assert Ash.get!(Transaction, receipt.id, actor: admin).amount == receipt.amount

    reactivated = request(:patch, professional, admin_token, %{is_active: true})
    assert reactivated.status == 200, reactivated.resp_body

    response = request(:delete, professional, admin_token)
    assert response.status in [200, 204], response.resp_body

    archived = Ash.get!(Professional, professional.id, actor: admin)
    refute archived.is_active
    assert archived.user_id == owner.id
    assert Ash.get!(Appointment, scheduled.id, actor: admin).professional_id == professional.id
    assert Ash.get!(Appointment, completed.id, actor: admin).status == :concluido
    assert Ash.get!(ProfessionalService, link.id, actor: admin).professional_id == professional.id
    assert Ash.get!(Transaction, receipt.id, actor: admin).amount == receipt.amount

    public_professionals =
      Professional |> Ash.Query.for_read(:read, %{}, actor: nil) |> Ash.read!()

    refute Enum.any?(public_professionals, &(&1.id == professional.id))

    restored = request(:patch, professional, admin_token, %{is_active: true})
    assert restored.status == 200, restored.resp_body
    assert Ash.get!(Professional, professional.id, actor: admin).is_active
  end
end
